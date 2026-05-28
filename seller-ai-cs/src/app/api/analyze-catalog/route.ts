import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

function extractProductNo(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    if (parsed.searchParams.has('product_no')) {
      return parsed.searchParams.get('product_no');
    }
    const pathParts = parsed.pathname.split('/');
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'product' && i + 2 < pathParts.length) {
        const possibleNo = pathParts[i + 2];
        if (/^\d+$/.test(possibleNo)) {
          return possibleNo;
        }
      }
    }
    const match = parsed.pathname.match(/\/product\/[^/]+\/(\d+)/i);
    if (match && match[1]) {
      return match[1];
    }
    const numberMatch = parsed.pathname.match(/\/(\d+)(?:\/|$)/);
    if (numberMatch && numberMatch[1]) {
      return numberMatch[1];
    }
  } catch (e) {
    return null;
  }
  return null;
}

export interface QueueItem {
  url: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'INSUFFICIENT' | 'CHECK_REQUIRED' | 'FAILED';
  productName: string;
  reason: string;
  elapsedMs: number;
  infoText?: string;
  imageCandidates?: any[];
  missingRequiredFields?: string[];
}

export interface TaskState {
  taskId: string;
  status: 'idle' | 'parsing' | 'processing' | 'completed' | 'failed';
  currentStep: string;
  progressPercent: number;
  totalFound: number;
  queuedCount: number;
  currentIndex: number;
  successCount: number;
  insufficientCount: number;
  checkRequiredCount: number;
  failedCount: number;
  items: QueueItem[];
  reportText: string;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
}

// ==========================================
// [중요] 인메모리 Map 선언 및 HMR 안전 캐싱
// 본 인메모리 Map은 개발 및 테스트를 위한 임시 구조이며, 
// 영속화 큐는 이후 버전(v0.6-C)에서 SQLite로 확장됩니다.
// 서버 재시작 시 상태가 유실될 수 있습니다.
// ==========================================
const globalTasks = (global as any).catalogTasks || new Map<string, TaskState>();
if (process.env.NODE_ENV !== 'production') {
  (global as any).catalogTasks = globalTasks;
}
export const catalogTasks = globalTasks as Map<string, TaskState>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 백그라운드 태스크 실행 프로미스
async function runBackgroundTask(
  taskId: string,
  catalogUrl: string,
  limit: number,
  localOrigin: string
) {
  const task = catalogTasks.get(taskId);
  if (!task) return;

  const startTime = Date.now();
  let totalFound = 0;
  let skippedDuplicateCount = 0;

  try {
    // 1. 목록 URL Fetch 단계 시작
    task.status = 'parsing';
    task.currentStep = '상품 목록 HTML 다운로드 중...';
    task.progressPercent = 5;
    task.updatedAt = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    let html = '';
    try {
      const res = await fetch(catalogUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`목록 Fetch 실패 (HTTP status: ${res.status})`);
      }

      html = await res.text();
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      throw new Error(`상품 목록을 가져오지 못했습니다: ${fetchErr.message || '네트워크 연결 실패'}`);
    }

    if (!html || html.length < 100) {
      throw new Error('상품 목록 내용이 비어있거나 너무 짧습니다.');
    }

    // 2. 링크 추출 단계
    task.currentStep = '상품 목록 파싱 및 중복 링크 제거 중...';
    task.progressPercent = 10;
    task.updatedAt = Date.now();

    const $ = cheerio.load(html);
    const originalUrlsList: string[] = [];

    // DHT-B2B 상품 링크 유형 스캔 셀렉터
    const selectors = [
      'a[href*="goods_no="]',
      'a[href*="/product/detail.html"]',
      'a[href*="/product/"]',
      '.goods_list_box a',
      '.goods_name a',
      '.goods_list a'
    ];

    selectors.forEach(sel => {
      $(sel).each((_, el) => {
        const href = $(el).attr('href')?.trim();
        if (href) {
          try {
            // 상대경로 -> 절대경로 안전 변환
            const absoluteUrl = new URL(href, catalogUrl).href;
            const parsedAbsolute = new URL(absoluteUrl);

            // 외부 도메인 URL 차단 가드 (목록 호스트와 일치 확인)
            const listHost = new URL(catalogUrl).hostname.replace('www.', '');
            const targetHost = parsedAbsolute.hostname.replace('www.', '');
            
            if (targetHost === listHost || targetHost.includes(listHost) || listHost.includes(targetHost)) {
              originalUrlsList.push(absoluteUrl);
            }
          } catch (e) {
            // URL 변환 에러 무시
          }
        }
      });
    });

    const rawTotalFound = originalUrlsList.length; // 전체 발견 링크 수

    // (DHT URL 안정성 필터링 이식)
    const excludePatterns = [
      'recent_view_product',
      'signup',
      'login',
      'join',
      'cart',
      'basket',
      'order',
      'mypage',
      'yechigeum',
      'board',
      'member',
      'search',
      'list.html',
      'category', // 카테고리 목록 페이지 배제
      'notice',
      'event',
      'faq'
    ];

    const dhtFilterPassList: string[] = [];
    let excludedNonProductCount = 0;

    originalUrlsList.forEach(urlVal => {
      try {
        const parsed = new URL(urlVal);
        const path = parsed.pathname;
        const lowerUrl = urlVal.toLowerCase();

        // 1단계: 비상품 제외 키워드 매칭
        let shouldExclude = false;
        for (const pattern of excludePatterns) {
          if (pattern === 'category') {
            if (path.startsWith('/category') || path.includes('/category.html') || path.includes('/category/list')) {
              shouldExclude = true;
              break;
            }
          } else {
            if (lowerUrl.includes(pattern.toLowerCase())) {
              shouldExclude = true;
              break;
            }
          }
        }

        if (shouldExclude) {
          excludedNonProductCount++;
          return;
        }

        // 2단계: 상품 상세 URL 허용 체크
        let isProduct = false;
        
        // (A) product_no= 가 파라미터로 포함된 경우
        if (parsed.searchParams.has('product_no')) {
          isProduct = true;
        }
        // (B) /product/detail.html 계열인 경우
        else if (path.includes('/product/detail.html')) {
          isProduct = true;
        }
        // (C) /product/상품명/상품번호 형태 (Cafe24 뉴상품 주소)
        else if (/^\/product\/[^/]+\/\d+/i.test(path)) {
          isProduct = true;
        }
        // (D) /product/숫자 형태
        else if (path.startsWith('/product/') && /\/\d+(?:\/|$)/.test(path)) {
          isProduct = true;
        }

        if (isProduct) {
          dhtFilterPassList.push(urlVal);
        } else {
          excludedNonProductCount++;
        }
      } catch (err) {
        excludedNonProductCount++;
      }
    });

    const filterPassTotal = dhtFilterPassList.length; // 상품 후보 통과 수

    // 3단계: 중복 및 동일 product_no 고유 중복 제거
    const uniqueFilterPassedList: string[] = [];
    const discoveredUniqueUrls = new Set<string>();
    const discoveredProductNos = new Set<string>();

    dhtFilterPassList.forEach(urlVal => {
      if (discoveredUniqueUrls.has(urlVal)) {
        skippedDuplicateCount++;
        return;
      }
      
      const pNo = extractProductNo(urlVal);
      if (pNo) {
        if (discoveredProductNos.has(pNo)) {
          skippedDuplicateCount++;
          return;
        }
        discoveredProductNos.add(pNo);
      }

      discoveredUniqueUrls.add(urlVal);
      uniqueFilterPassedList.push(urlVal);
    });

    totalFound = uniqueFilterPassedList.length;
    task.totalFound = totalFound;

    // 4. 큐 할당
    const targetQueueUrls = uniqueFilterPassedList.slice(0, limit);
    const queuedCount = targetQueueUrls.length;

    task.queuedCount = queuedCount;
    
    if (queuedCount === 0) {
      task.status = 'completed';
      task.progressPercent = 100;
      task.completedAt = Date.now();
      task.updatedAt = Date.now();
      task.reportText = [
        `# 📊 상품학습팀 업무보고`,
        `- **전체 발견 링크 수**: ${rawTotalFound}개`,
        `- **상품 후보 통과 수**: ${filterPassTotal}개`,
        `- **제외된 비상품 링크 수**: ${excludedNonProductCount}개`,
        `- **최종 수집 대상 URL 수**: ${queuedCount}개`,
        ``,
        `⚠️ **상품 상세 URL 후보를 찾지 못했습니다. 상품 목록 페이지 구조 또는 필터 조건 확인이 필요합니다.**`
      ].join('\n');
      return;
    }

    // FIFO 대기열 초기화
    const queueItems: QueueItem[] = targetQueueUrls.map(u => ({
      url: u,
      status: 'PENDING',
      productName: '',
      reason: '',
      elapsedMs: 0
    }));

    task.items = queueItems;
    task.status = 'processing';
    task.progressPercent = 15;
    task.updatedAt = Date.now();

    let successCount = 0;
    let insufficientCount = 0;
    let checkRequiredCount = 0;
    let failedCount = 0;

    // 4. 순차 처리 메인 큐 가동
    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      task.currentIndex = i + 1;
      task.currentStep = `상품 [${i + 1}/${queuedCount}] 분석 중...`;
      
      // Jitter Throttling Delay 적용 (1번째 상품 이후부터 3~5초 사이 딜레이)
      if (i > 0) {
        const delay = Math.round(Math.random() * 2000 + 3000);
        task.currentStep = `상품 [${i + 1}/${queuedCount}] 분석 대기 중 (안전 딜레이: ${(delay/1000).toFixed(1)}초)...`;
        task.updatedAt = Date.now();
        await sleep(delay);
      }

      item.status = 'PROCESSING';
      task.currentStep = `상품 [${i + 1}/${queuedCount}] 분석 엔진 구동 중...`;
      task.progressPercent = Math.round(15 + (i / queuedCount) * 80);
      task.updatedAt = Date.now();

      const itemStartTime = Date.now();
      
      try {
        console.log(`[analyze-catalog queue] [${i + 1}/${queuedCount}] Dispatching: ${item.url}`);
        const dispatchRes = await fetch(`${localOrigin}/api/analyze-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url })
        });

        item.elapsedMs = Date.now() - itemStartTime;

        if (dispatchRes.ok) {
          const resData = await dispatchRes.json();
          
          if (resData.success) {
            item.productName = resData.productName || '상품명 미식별';
            const unknowns = resData.unknownsCount || 0;
            const qualityScore = resData.qualityScore || 100;
            item.infoText = resData.infoText || resData.productInfo || '';
            item.imageCandidates = resData.imageCandidates || [];

            // --- 상품 유형 분류 및 고도화 필터링 (v1.0-F) ---
            const combinedText = (item.productName + " " + (resData.infoText || resData.productInfo || '')).toLowerCase();
            let category = '일반/기타';
            if (/의류|티셔츠|바지|원피스|셔츠|자켓|점퍼|양말|신발|패션|맨투맨/i.test(combinedText)) category = '의류';
            else if (/주방|도마|컵|텀블러|식기|조리도구|밀폐용기|서빙보드|수저/i.test(combinedText)) category = '주방용품';
            else if (/가전|콘센트|충전기|조명|모터|led|멀티탭|어댑터|전기|온열|발열/i.test(combinedText)) category = '전기/가전';
            else if (/아동|키즈|장난감|유아|어린이|토이/i.test(combinedText)) category = '어린이/유아';
            else if (/가구|책상|의자|선반|수납장|침대|행거/i.test(combinedText)) category = '가구/수납';
            else if (/텐트|매트|운동기구|캠핑|헬스|스포츠|야외/i.test(combinedText)) category = '스포츠/캠핑';

            // 카테고리별 제외 키워드
            let excludeKws: string[] = [];
            if (category === '의류') excludeKws = ['식품', '하중', '전압', '소비전력', '방수', '어린이', 'kc', '시험성적서'];
            else if (category === '주방용품') excludeKws = ['세탁', '하중', '전압', '소비전력'];
            else if (category === '전기/가전') excludeKws = ['세탁', '식품', '하중'];
            else if (category === '어린이/유아') excludeKws = ['식품', '전압', '소비전력'];
            else if (category === '가구/수납') excludeKws = ['식품', '세탁', '전압', '소비전력'];
            else if (category === '스포츠/캠핑') excludeKws = ['식품', '전압', '소비전력'];

            // 민감 항목 복구 키워드
            const restoreKws: string[] = [];
            if (/아동|키즈|유아|어린이/i.test(combinedText)) restoreKws.push('어린이', 'kc');
            if (/방수|생활방수|야외|캠핑/i.test(combinedText)) restoreKws.push('방수', '내구성');
            if (/선반|행거|수납|의자|캠핑의자/i.test(combinedText)) restoreKws.push('하중', '내하중');
            if (/전기|온열|발열|충전|led/i.test(combinedText)) restoreKws.push('kc', '전기', '전압', '소비전력');
            if (/주방|식기|컵|용기|조리/i.test(combinedText)) restoreKws.push('식품');

            // 누락 필수 스펙 항목 자율 추출 및 구조화 (v1.0-F)
            const rawMissingList: string[] = [];
            const foundCoreFields: string[] = [];
            const absenceKeywords = ["명시 없음", "확인되지 않음", "제공 여부 확인 필요", "상세페이지 내 명시 없음", "확인 필요", "별도 표기 없음", "미확인"];
            const infoTextVal = resData.infoText || resData.productInfo || '';
            const coreKeywords = ['상품명', '색상', '옵션', '사이즈', '규격', '크기', '소재', '재질', '배송', '출고'];
            
            infoTextVal.split('\n').forEach((line: string) => {
              if (line.includes(':')) {
                const keyPart = line.substring(0, line.indexOf(':')).replace(/^-\s*/, '').trim();
                const valPart = line.substring(line.indexOf(':') + 1);
                
                const isMissing = absenceKeywords.some(kw => valPart.includes(kw));
                if (isMissing) {
                  rawMissingList.push(keyPart);
                } else {
                  if (coreKeywords.some(ck => keyPart.includes(ck))) {
                    foundCoreFields.push(keyPart);
                  }
                }
              }
            });

            // 필터링 적용
            const missingList = rawMissingList.filter(missingField => {
              const lowerField = missingField.toLowerCase();
              let isIrrelevant = excludeKws.some(ex => lowerField.includes(ex));
              let isRestored = restoreKws.some(res => lowerField.includes(res));
              return !isIrrelevant || isRestored; // 무관하지 않거나, 다시 복구된 경우에만 남김
            });

            const irrelevantExcludedList = rawMissingList.filter(x => !missingList.includes(x));

            item.missingRequiredFields = missingList;
            (item as any).category = category;
            (item as any).irrelevantExcluded = irrelevantExcludedList;

            // 수명주기 6단계 상태 정밀 평가 (고도화 기준)
            const filteredUnknowns = missingList.length;
            const coreMetCount = foundCoreFields.length;

            if (qualityScore < 70) {
              item.status = 'CHECK_REQUIRED';
              checkRequiredCount++;
              item.reason = `${category} 상품으로 판단됨 / 품질 점수 미달 (${qualityScore}점) / 자동 답변 불가 / 판매자 검수 필요`;
            } else if (restoreKws.some(kw => missingList.some(m => m.toLowerCase().includes(kw)))) {
              // 민감 항목이 누락된 경우 강제 CHECK_REQUIRED
              item.status = 'CHECK_REQUIRED';
              checkRequiredCount++;
              const sensitiveMissings = missingList.filter(m => restoreKws.some(kw => m.toLowerCase().includes(kw)));
              item.reason = `${category} 상품으로 판단됨 / 민감 스펙 누락 확인 필요: ${sensitiveMissings.join(', ')} / 자동 답변 불가 / 판매자 보완 권장`;
            } else if (filteredUnknowns >= 2 || coreMetCount < 3) {
              item.status = 'INSUFFICIENT';
              insufficientCount++;
              const displayMissing = missingList.slice(0, 3).join(', ');
              item.reason = `${category} 상품으로 판단됨 / 핵심 정보 일부 부족${displayMissing ? `: ${displayMissing}` : ''} / 자동 답변 가능: 부분 가능 / 판매자 보완 권장`;
            } else {
              item.status = 'SUCCESS';
              successCount++;
              item.reason = `${category} 상품으로 판단됨 / 핵심 정보 충족 (${coreMetCount}개 이상) / 자동 답변 가능: 완전 가능`;
            }
          } else {
            item.status = 'FAILED';
            failedCount++;
            item.reason = resData.error || '분석 엔진 내부 처리 실패';
          }
        } else {
          item.status = 'FAILED';
          failedCount++;
          item.reason = `HTTP status 에러: ${dispatchRes.status}`;
        }
      } catch (err: any) {
        item.status = 'FAILED';
        failedCount++;
        item.reason = err.message || '네트워크 타임아웃/연결 장애';
        item.elapsedMs = Date.now() - itemStartTime;
      }

      // 상태 업데이트 카운터
      task.successCount = successCount;
      task.insufficientCount = insufficientCount;
      task.checkRequiredCount = checkRequiredCount;
      task.failedCount = failedCount;
      
      // 진행률 업데이트
      task.progressPercent = Math.round(15 + ((i + 1) / queuedCount) * 80);
      task.updatedAt = Date.now();
      
      console.log(`[analyze-catalog queue] [${i + 1}/${queuedCount}] Done. Status: ${item.status}`);
    }

    const totalElapsed = Date.now() - startTime;

    // 5. 완료 처리 및 최종 보고서 마크다운 생성
    task.status = 'completed';
    task.currentStep = '자동학습 배치 최종 완료';
    task.progressPercent = 100;
    task.completedAt = Date.now();
    task.updatedAt = Date.now();

    const reportLines = [
      `# 📊 상품학습팀 업무보고`,
      `- **전체 발견 링크 수**: ${rawTotalFound}개`,
      `- **상품 후보 통과 수**: ${filterPassTotal}개`,
      `- **제외된 비상품 링크 수**: ${excludedNonProductCount}개`,
      `- **최종 수집 대상 URL 수**: ${queuedCount}개`,
      ``,
      `- **수집 성공**: ${successCount}개`,
      `- **정보 부족**: ${insufficientCount}개`,
      `- **확인 필요(검수필요)**: ${checkRequiredCount}개`,
      `- **실패**: ${failedCount}개`,
      ``
    ];

    // 정보부족 / 검수필요 상품의 누락 항목 요약 추가 (v1.0-F)
    const issueItems = queueItems.filter(x => x.status === 'INSUFFICIENT' || x.status === 'CHECK_REQUIRED');
    if (issueItems.length > 0) {
      reportLines.push(`### ⚠️ 수집 정보 보완 필요 상품 요약`);
      issueItems.forEach((item, index) => {
        const cat = (item as any).category || '일반/기타';
        const missingStr = item.missingRequiredFields && item.missingRequiredFields.length > 0
          ? item.missingRequiredFields.join(', ')
          : '핵심 필드 3개 미만 충족 등';
        const excludedStr = (item as any).irrelevantExcluded && (item as any).irrelevantExcluded.length > 0
          ? (item as any).irrelevantExcluded.join(', ')
          : '없음';

        reportLines.push(`${index + 1}. **${item.productName || '상품명 미식별'}** \`[${cat}]\``);
        reportLines.push(`   - **상태**: ${item.status === 'INSUFFICIENT' ? '정보 부족 (부분 답변 가능)' : '확인 필요 (판매자 검수 요망)'}`);
        reportLines.push(`   - **실제 부족한 핵심 필드**: \`${missingStr}\``);
        reportLines.push(`   - **상품군과 무관하여 제외된 항목**: \`${excludedStr}\``);
        reportLines.push(`   - **상세 사유**: ${item.reason}`);
      });
      reportLines.push(``);
    }

    reportLines.push(
      `### 🤵 대표 에이전트 총평`,
      `이번 상품목록 자동학습이 완료되었습니다.`,
      checkRequiredCount > 0 || insufficientCount > 0 
        ? `확인 필요한 상품만 검토하시면 됩니다. 정보 부족이나 품질 미달 상품(${checkRequiredCount + insufficientCount}건)의 옵션 정보만 매뉴얼로 보완해 주시기 바랍니다.` 
        : `모든 수집 대상이 품질 지표를 만족하며 무결하게 AI 학습 완료되었습니다! 추가 검토가 필요하지 않습니다.`,
      ``,
      `*   **총 소요 시간**: ${(totalElapsed / 1000).toFixed(1)}초 (중복 스킵: ${skippedDuplicateCount}개)`
    );

    task.reportText = reportLines.join('\n');

  } catch (err: any) {
    console.error(`[analyze-catalog task failed] taskId: ${taskId}, error:`, err);
    task.status = 'failed';
    task.currentStep = `에러 발생: ${err.message || '알 수 없는 오류'}`;
    task.completedAt = Date.now();
    task.updatedAt = Date.now();

    // 실패한 경우에도 보고서 생성해 줌
    const totalElapsed = Date.now() - startTime;
    const reportLines = [
      `# 📊 상품학습팀 업무보고 (중단됨)`,
      `**원인**: ${err.message || '알 수 없는 서버 내부 비정상 종료'}`,
      `- **발견 상품**: ${totalFound}개`,
      `- **처리 상품**: ${task.items.filter(x => x.status !== 'PENDING').length}개 / 전체 대기 ${task.queuedCount}개`,
      `- **성공**: ${task.successCount}개`,
      `- **정보 부족**: ${task.insufficientCount}개`,
      `- **확인 필요**: ${task.checkRequiredCount}개`,
      `- **실패**: ${task.failedCount}개`,
      ``,
      `### 🤵 대표 에이전트 총평`,
      `대량 수집 도중 오류가 발생하여 작업이 비정상적으로 조기 중단되었습니다. 상세 상세 기록을 참조하시기 바랍니다.`,
      `*   **총 소요 시간**: ${(totalElapsed / 1000).toFixed(1)}초`
    ];
    task.reportText = reportLines.join('\n');
  }
}

// POST /api/analyze-catalog
export async function POST(req: Request) {
  try {
    const { url: catalogUrl, limit: reqLimit } = await req.json();

    if (!catalogUrl || !catalogUrl.startsWith('http')) {
      return NextResponse.json({ success: false, error: '유효한 상품목록 URL이 아닙니다.' }, { status: 400 });
    }

    // 1. 수집 수 한도 설정 (기본 3, 최대 10, 하드리밋 30)
    let limit = 3; // 기본 3
    if (reqLimit !== undefined) {
      const parsedLimit = parseInt(reqLimit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 30); // 하드리밋 30
      }
    }

    // 2. taskId 고유 발급 (timestamp + random string 조합)
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // 3. TaskState 초기화 및 임시 맵 캐싱 등록
    const initialTask: TaskState = {
      taskId,
      status: 'idle',
      currentStep: '분석 대기열 등록 완료',
      progressPercent: 0,
      totalFound: 0,
      queuedCount: 0,
      currentIndex: 0,
      successCount: 0,
      insufficientCount: 0,
      checkRequiredCount: 0,
      failedCount: 0,
      items: [],
      reportText: '',
      startedAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null
    };

    catalogTasks.set(taskId, initialTask);

    // 4. 로컬 Origin 획득 (백그라운드에서 fetch(/api/analyze-url) 할 때 사용)
    let localOrigin = '';
    if (req.url) {
      try {
        const parsedReqUrl = new URL(req.url);
        localOrigin = parsedReqUrl.origin;
      } catch (e) {
        const host = req.headers.get('host');
        localOrigin = host ? `http://${host}` : `http://localhost:3000`;
      }
    } else {
      localOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    }

    // 5. 백그라운드 비동기 가동 (await 없이 실행)
    runBackgroundTask(taskId, catalogUrl, limit, localOrigin).catch(bgErr => {
      console.error(`[analyze-catalog bg task critical error] taskId: ${taskId}`, bgErr);
    });

    console.log(`[analyze-catalog] Task created: ${taskId}. Responding immediately with 200 OK.`);

    // 6. 즉시 taskId 발급 반환 (Non-blocking)
    return NextResponse.json({
      success: true,
      taskId
    });

  } catch (globalError: any) {
    console.error('Analyze-Catalog API Global Error:', globalError);
    return NextResponse.json({ 
      success: false, 
      error: `서버 전역 오류가 발생했습니다: ${globalError.message || '다시 시도해 주세요'}` 
    }, { status: 500 });
  }
}
