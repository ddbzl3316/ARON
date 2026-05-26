import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface QueueItem {
  url: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'INSUFFICIENT' | 'CHECK_REQUIRED' | 'FAILED';
  productName: string;
  reason: string;
  elapsedMs: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  const startTime = Date.now();
  let totalFound = 0;
  let skippedDuplicateCount = 0;
  
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

    console.log(`[analyze-catalog] Fetching list URL: ${catalogUrl}, limit target: ${limit}`);

    // 2. 목록 URL Fetch
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
      return NextResponse.json({ 
        success: false, 
        error: `상품목록을 가져오는 데 실패했습니다: ${fetchErr.message || '네트워크 장애'}` 
      }, { status: 500 });
    }

    if (!html || html.length < 100) {
      return NextResponse.json({ success: false, error: '상품목록 내용이 너무 짧거나 비어있습니다.' }, { status: 500 });
    }

    // 3. Cheerio 파싱 및 상세 URL 추출
    const $ = cheerio.load(html);
    const parsedOrigin = new URL(catalogUrl).origin;
    const discoveredUrls = new Set<string>();
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
            // 상대경로 ➔ 절대경로 안전하게 변환
            const absoluteUrl = new URL(href, catalogUrl).href;
            const parsedAbsolute = new URL(absoluteUrl);

            // 외부 도메인 URL 차단 가드 (목록 URL의 호스트명과 다른 외부 사이트는 원천 차단)
            const listHost = new URL(catalogUrl).hostname.replace('www.', '');
            const targetHost = parsedAbsolute.hostname.replace('www.', '');
            
            if (targetHost === listHost || targetHost.includes(listHost) || listHost.includes(targetHost)) {
              originalUrlsList.push(absoluteUrl);
            }
          } catch (e) {
            // URL 파싱 오류 무시
          }
        }
      });
    });

    totalFound = originalUrlsList.length;

    // 중복 제거 가동 (Set 활용)
    const uniqueUrls: string[] = [];
    originalUrlsList.forEach(urlVal => {
      if (!discoveredUrls.has(urlVal)) {
        discoveredUrls.add(urlVal);
        uniqueUrls.push(urlVal);
      } else {
        skippedDuplicateCount++;
      }
    });

    // 4. 큐에 최대 limit 만큼 적재
    const targetQueueUrls = uniqueUrls.slice(0, limit);
    const queuedCount = targetQueueUrls.length;

    console.log(`[analyze-catalog] Found total: ${totalFound}, Unique: ${uniqueUrls.length}, Queued: ${queuedCount}`);

    // FIFO 대기열 초기화
    const queueItems: QueueItem[] = targetQueueUrls.map(u => ({
      url: u,
      status: 'PENDING',
      productName: '',
      reason: '',
      elapsedMs: 0
    }));

    // 5. 로컬 API 엔드포인트 Origin 획득
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

    let successCount = 0;
    let insufficientCount = 0;
    let checkRequiredCount = 0;
    let failedCount = 0;

    // 6. 순차 처리 메인 큐 가동
    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      item.status = 'PROCESSING';
      
      const itemStartTime = Date.now();
      console.log(`[analyze-catalog queue] [${i + 1}/${queuedCount}] Started: ${item.url}`);

      // 3~5초 Jitter Delay 적용 (대상 서버 보호 및 차단 예방)
      if (i > 0) {
        const delay = Math.round(Math.random() * 2000 + 3000);
        console.log(`[analyze-catalog queue] Throttling delay: ${delay}ms...`);
        await sleep(delay);
      }

      try {
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

            // 수명주기 6단계 상태 정밀 평가
            // unknownsCount 가 3개 이상 ➔ INSUFFICIENT (정보 부족)
            // qualityScore 가 70점 미만 ➔ CHECK_REQUIRED (검수 필요)
            if (qualityScore < 70) {
              item.status = 'CHECK_REQUIRED';
              checkRequiredCount++;
              item.reason = `품질 점수 미달 (${qualityScore}점)`;
            } else if (unknowns >= 3) {
              item.status = 'INSUFFICIENT';
              insufficientCount++;
              item.reason = `필수 고시/스펙 부족 (미확인 사양: ${unknowns}개)`;
            } else {
              item.status = 'SUCCESS';
              successCount++;
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

      console.log(`[analyze-catalog queue] [${i + 1}/${queuedCount}] Finished. Status: ${item.status}, elapsed: ${item.elapsedMs}ms`);
    }

    const totalElapsed = Date.now() - startTime;

    // 7. 사람이 읽을 수 있는 마크다운 최종 요약 보고서 작성 (총괄 디렉터 에이전트 서명 규격)
    const reportLines = [
      `# 📊 대량 수집 및 AI 자동학습 결과 보고서`,
      `**배치 완료 일시**: ${new Date().toLocaleString('ko-KR')}`,
      `**총 소요 시간**: ${(totalElapsed / 1000).toFixed(1)}초`,
      ``,
      `### 📈 핵심 요약 지표`,
      `*   **발견된 총 링크 (totalFound)**: ${totalFound}개`,
      `*   **중복 제거로 스킵된 링크 (skippedDuplicates)**: ${skippedDuplicateCount}개`,
      `*   **큐에 적재 및 처리된 개수 (queuedCount)**: ${queuedCount}개 (한도 적용: ${limit}개)`,
      `*   **성공 (SUCCESS)**: ${successCount}건`,
      `*   **정보 부족 (INSUFFICIENT)**: ${insufficientCount}건`,
      `*   **검수 필요 (CHECK_REQUIRED)**: ${checkRequiredCount}건`,
      `*   **실패 (FAILED)**: ${failedCount}건`,
      ``,
      `### 🔍 상세 처리 명세`
    ];

    queueItems.forEach((item, idx) => {
      let statusEmoji = '❓';
      if (item.status === 'SUCCESS') statusEmoji = '✅';
      else if (item.status === 'INSUFFICIENT') statusEmoji = '⚠️';
      else if (item.status === 'CHECK_REQUIRED') statusEmoji = '🔍';
      else if (item.status === 'FAILED') statusEmoji = '❌';

      const reasonSuffix = item.reason ? ` - *사유: ${item.reason}*` : '';
      reportLines.push(`${idx + 1}. ${statusEmoji} **[${item.status}]** ${item.productName || '식별불가'} (소요시간: ${(item.elapsedMs/1000).toFixed(1)}초)  \n   URL: ${item.url}${reasonSuffix}`);
    });

    const reportText = reportLines.join('\n');

    return NextResponse.json({
      success: true,
      totalFound,
      queuedCount,
      successCount,
      insufficientCount,
      checkRequiredCount,
      failedCount,
      skippedDuplicateCount,
      totalElapsedMs: totalElapsed,
      items: queueItems,
      reportText
    });

  } catch (globalError: any) {
    console.error('Analyze-Catalog API Global Error:', globalError);
    return NextResponse.json({ 
      success: false, 
      error: `서버 전역 오류가 발생했습니다: ${globalError.message || '다시 시도해 주세요'}` 
    }, { status: 500 });
  }
}
