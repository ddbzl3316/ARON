import { useState, useEffect } from 'react';

export interface InquiryHistory {
  id: string;
  date: string;
  customerInquiry: string;
  sellerMemo: string;
  csReply: string;
}

export interface ProductMatch {
  productId: string;
  matchScore: number; // 0 ~ 100
  matchReason: string[];
}

export interface Product {
  productId: string;
  name: string;
  url: string;
  info: string;
  createdAt: string;
  updatedAt: string;
  inquiries: InquiryHistory[];
  internalMemo?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  reviewStatus?: 'auto_draft' | 'needs_review' | 'blocked';
  productCode?: string; // 상품 고유 식별 코드 추가
  sellerName?: string;  // 공급처/판매처명
  category?: string;    // 상품 카테고리
  learningStatus?: '미학습' | '정보 입력됨' | 'URL 분석 필요' | '이미지 분석 필요' | '학습 완료' | '정보 부족'; // AI 학습 현황
  
  // v1.1 안정화 수집 출처 필드 추가
  collectionSource?: string;
  collectedAt?: string;

  // v0.3 상세페이지 이미지 후보 필드 추가
  imageCandidates?: { 
    url: string; 
    status: 'pending' | 'analyzed' | 'failed'; 
    reason?: string; 
    resultText?: string; 
    score?: number; 
    candidateType?: string; 
  }[];

  // v0.3.1 분석 프로필 구조 추가
  analysisProfile?: 'generic' | 'dht-b2b' | 'domeggook' | 'smartstore' | 'coupang' | 'custom';

  // v0.4 수집 품질 분석 점수 추가
  qualityScore?: number;

  // v0.5.2 상품명 복구 및 깨짐 메타데이터 추가
  isNameRecovered?: 'yes' | 'no';
  isNameBroken?: 'yes' | 'no';

  // v0.5.2.3 도매꾹 숫자 URL 중복 판정 보정 및 canonical 식별자 필드 추가
  productKey?: string;
  sourceKey?: string;

  // v0.5.2.4 name 필드와 항상 100% 동기화하기 위한 optional productName 필드 추가
  productName?: string;
}


// 24시간 실시간 AI CS 에이전트 데이터 모델 정의 (수동 입력 및 실제 운영 대응 필드 확장)
export interface InboxItem {
  id: string;
  customerInquiry: string;
  receivedAt: string;
  intent: string;                  // 문의 의도 (예: 배송 일정, 세탁법, 교환/환불 등)
  matchedProductName: string;      // AI가 판단한 상품명
  matchedProductId?: string;       // 매칭된 상품 DB ID
  matchScore: number;              // 판단 신뢰 점수 (0~100점)
  replyDraft: string;              // AI가 미리 생성해 둔 CS 답변 초안
  riskLevel: 'low' | 'medium' | 'high'; // 위험도
  riskReason?: string;             // 위험 문구 검출 원인
  status: 'pending' | 'drafted' | 'approved' | 'on_hold'; // 처리 상태
  sellerMemo?: string;             // 판매자 추가 기재/수정 메모
  
  // 실제 운영 대응 및 수동 문의 유입용 신규 속성
  sourceSite?: string;             // 수집 채널 (예: 스마트스토어, 쿠팡, 자사몰 등)
  productCode?: string;            // 유입된 상품 코드
  productUrl?: string;             // 유입된 상품 URL
  identificationStatus?: 'identified' | 'needs_review'; // 상품 식별 성공 여부 ('identified' = 식별 완료, 'needs_review' = 확인 필요)
  isManual?: boolean;              // 수동 직접 추가된 문의인지 여부
  isDemo?: boolean;                // 데모 시뮬레이션용 데이터 분리 플래그 추가
  
  // v1.1 안정화 수집 출처 필드 추가
  collectionSource?: string;
  collectedAt?: string;
  inquiryId?: string;
}

export interface CollectionHistory {
  id: string;
  collectedAt: string;
  agentType: '상품 수집' | '문의 수집';
  connectorName: string;
  totalCount: number;
  insertedCount: number;
  updatedCount: number;
  skipCount: number;
  needsReviewCount: number;
  riskCount: number;
  status: '성공' | '일부 실패' | '실패';
  
  // v0.3.3 파서 분석 품질 점검 지표 추가
  analysisProfile?: string;
  imageCandidatesCount?: number;
  optionSpecsExtracted?: boolean;
  unknownsCount?: number;
  isLowInfo?: boolean;
  isNameConflictDetected?: boolean;

  // v0.4 수집 품질 평균 점수 추가
  qualityScore?: number;

  // v0.5.4 실전 벤치마크 준비용 이미지 후보 품질 지표 추가
  imageStats_totalCount?: number;
  imageStats_placeholderExcluded?: number;
  imageStats_secureExcluded?: number;
  imageStats_detailCandidates?: number;
  imageStats_optionCandidates?: number;
  imageStats_failedPreviewsCount?: number;
  imageStats_averageScore?: number;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

// 최초 접속용 가상 문의 시뮬레이션 데이터 3건
const INITIAL_INBOX_ITEMS: InboxItem[] = [
  {
    id: 'inbox_1',
    customerInquiry: '안녕하세요, 어제 쿨 마스크 3개 주문했는데 언제 배송되나요? 다음 주 수요일 휴가 갈 때 가져가야 해서 그전까지는 꼭 받아야 하거든요. 빠른 배송 부탁드립니다!',
    receivedAt: new Date(Date.now() - 3600000 * 2).toLocaleString('ko-KR'), // 2시간 전
    intent: '출고/배송 일정 문의',
    matchedProductName: '쿨 마스크',
    matchScore: 95,
    riskLevel: 'low',
    replyDraft: '안녕하세요 고객님! 셀러 AI CS 도우미입니다. 귀한 시간 내어 저희 상품을 구매해주셔서 감사드립니다.\n\n문의해주신 \'쿨 마스크\' 주문 건은 금일 택배사(한진택배)를 통해 정상적으로 출고 완료될 예정입니다. 보통 출고 후 영업일 기준 1~2일 내로 배송 완료되므로, 주말을 제외하고 늦어도 다음 주 월요일이나 화요일 안에는 수령 가능하실 것으로 예상된다는 점 안내해 드립니다.\n\n최대한 빠르게 받아보실 수 있도록 배송사에 특별히 신속 배송을 요청해 두었습니다. 기분 좋은 휴가 다녀오시기를 바라며, 다른 문의사항이 있으시면 언제든지 편하게 문의해주세요!',
    status: 'drafted',
    sourceSite: '스마트스토어',
    identificationStatus: 'identified',
    isDemo: true,
  },
  {
    id: 'inbox_2',
    customerInquiry: '쿨 마스크 세탁기 울코스로 살살 돌렸는데, 이거 혹시 건조기에 돌려도 되나요? 소재가 망가지거나 쪼그라들까봐 걱정되네요. 빠른 답변 부탁드립니다.',
    receivedAt: new Date(Date.now() - 3600000 * 1.2).toLocaleString('ko-KR'), // 1.2시간 전
    intent: '제품 세탁 및 사후 관리법',
    matchedProductName: '쿨 마스크',
    matchScore: 92,
    riskLevel: 'medium',
    riskReason: '기능성 소재 건조기 사용 불가 주의사항 안내 필수',
    replyDraft: '안녕하세요 고객님! 셀러 AI CS 도우미입니다. 상품 관리에 대해 안내해 드립니다.\n\n저희 \'쿨 마스크\'는 특수 기능성 쿨링 원사로 제작되었습니다. 기능성 원단 특성상 고온의 **건조기를 사용하실 경우 소재가 수축하거나 쿨링 기능이 심각하게 훼손될 위험**이 있습니다. 따라서 건조기 사용은 절대 금해 주시길 부탁드립니다.\n\n세탁기 울코스로 세탁하신 후에는 그늘지고 통풍이 잘되는 곳에 눕혀서 자연 건조해주시면 옷감 변형 없이 오랫동안 시원하게 착용하실 수 있습니다. 추가적인 세탁 팁은 상품 상세페이지 하단 관리 요령을 참고해주세요!',
    status: 'drafted',
    sourceSite: '쿠팡',
    identificationStatus: 'identified',
    isDemo: true,
  },
  {
    id: 'inbox_3',
    customerInquiry: '쿨 마스크 받았는데 박스가 약간 찌그러져서 왔네요. 선물용으로 산 건데 기분이 정말 나빠요. 배송 과정 문제든 아니든 새 걸로 다시 보내주던가 환불해주세요. 안 해주면 소비자원 고발하고 인터넷 카페에 글 올리겠습니다.',
    receivedAt: new Date(Date.now() - 3600000 * 0.5).toLocaleString('ko-KR'), // 30분 전
    intent: '파손 교환 / 불만 환불 및 강경 대응',
    matchedProductName: '쿨 마스크',
    matchScore: 88,
    riskLevel: 'high',
    riskReason: '소비자원 고발 및 온라인 카페 여론 유포 위협 감지됨',
    replyDraft: '안녕하세요 고객님. 먼저 배송 과정 중 패키지 훼손으로 인하여 선물 준비에 큰 실망을 드린 점 머리 숙여 깊이 사과드립니다. 박스가 찌그러진 상태로 수령하셨을 때의 상한 마음을 충분히 이해합니다.\n\n고객님의 소중한 기분을 보상해드리기 위하여, 배송비 왕복 전액 판매자 부담으로 즉시 **새 상품 무상 맞교환** 또는 **100% 전액 환불** 처리를 도와드리고자 합니다. 본 문의에 대해 [교환] 또는 [환불] 중 편하신 처리 방식을 답변해 주시면 즉각 접수하여 처리하겠습니다.\n\n불편을 끼쳐드려 다시 한번 진심으로 죄송하며, 신속하고 원만한 해결을 위해 최선을 다하겠습니다.',
    status: 'drafted',
    sourceSite: '스마트스토어',
    identificationStatus: 'identified',
    isDemo: true,
  }
];

const INITIAL_LOGS: AgentLog[] = [
  {
    id: 'log_1',
    timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    type: 'success',
    message: '🟢 CS AI 에이전트가 24시간 실시간 감시 모드로 가동을 시작했습니다.'
  },
  {
    id: 'log_2',
    timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    type: 'info',
    message: '📥 쇼핑몰 플랫폼으로부터 신규 문의 [inbox_1] 수집 및 DB 분석 중...'
  },
  {
    id: 'log_3',
    timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    type: 'success',
    message: '🔍 [inbox_1] 매칭 완료 -> "쿨 마스크" (매칭도 95%). 답변 초안 작성 완료.'
  },
  {
    id: 'log_4',
    timestamp: new Date(Date.now() - 3600000 * 1.2).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    type: 'info',
    message: '📥 쇼핑몰 플랫폼으로부터 신규 문의 [inbox_2] 수집 완료.'
  },
  {
    id: 'log_5',
    timestamp: new Date(Date.now() - 3600000 * 1.2).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    type: 'warning',
    message: '⚠️ [inbox_2] 건조기 금지 안내 누락 위험 감출. 위험도 [중간]으로 분류하여 답변 보강 완료.'
  },
  {
    id: 'log_6',
    timestamp: new Date(Date.now() - 3600000 * 0.5).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    type: 'info',
    message: '📥 쇼핑몰 플랫폼으로부터 신규 문의 [inbox_3] 수집 완료.'
  },
  {
    id: 'log_7',
    timestamp: new Date(Date.now() - 3600000 * 0.5).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    type: 'error',
    message: '🚨 [inbox_3] "소비자원 고발" 및 여론 협박 위협 감출! 위험도 [높음] 극도로 주의 요망. 강경 사과 조안 수립.'
  }
];

// 깨진 한글 감지 헬퍼 (useProductDB.ts 내부용, v0.5.2.4 정밀 보정)
const isBrokenText = (text: string): boolean => {
  if (!text) return false;
  
  // 1. \uFFFD (대체 문자) 개수 검사 (3개 이상 시 깨짐으로 즉시 판정)
  const fffdMatches = text.match(/\uFFFD/g);
  const fffdCount = fffdMatches ? fffdMatches.length : 0;
  if (fffdCount >= 3) return true;

  // 2. 대체 문자()가 2회 이상 연속/반복되는 경우 감지
  if (text.includes('\uFFFD\uFFFD') || /\uFFFD{2,}/.test(text)) return true;

  // 3. EUC-KR / CP949 디코딩 에러 특유의 깨진 바이트 패턴 감지 (빈 문자열 차단)
  const brokenPatterns = ['占쏙옙', '폚', '쩔', '욉', '쎥', '댵', '쏚', '쳰'];
  for (const pat of brokenPatterns) {
    if (pat && text.includes(pat)) return true;
  }

  // 4. 한글/영문/숫자 대비 깨진 특수문자 및 외계 상용한자 비중 분석
  const totalLength = text.length;
  if (totalLength > 5) {
    const normalMatches = text.match(/[가-힣a-zA-Z0-9\s.,!?~()\[\]{}&_\-+:：]/g);
    const normalCount = normalMatches ? normalMatches.length : 0;
    if (normalCount / totalLength < 0.4) {
      return true;
    }
  }
  return false;
};

// 상품명 placeholder 여부 판정 헬퍼
export const isPlaceholderProductName = (name?: string): boolean => {
  if (!name) return true;
  const trimmed = name.trim();
  const placeholders = [
    '상품명 확인 필요',
    '이름 없음',
    '확인되지 않음',
    '명시 없음',
    '미확인',
    '상품'
  ];
  return placeholders.includes(trimmed);
};

// 정상 상품명 수호 및 비정상/placeholder 덮어쓰기 방지 헬퍼
const resolveSafeProductName = (newName: string, existingName?: string): string => {
  const isInvalid = (n?: string): boolean => {
    if (!n) return true;
    const trimmed = n.trim();
    return (
      trimmed === "" ||
      isPlaceholderProductName(trimmed) ||
      isBrokenText(trimmed)
    );
  };

  const cleanNew = newName ? newName.trim() : "";
  const cleanExisting = existingName ? existingName.trim() : "";

  // 1. 새로운 상품명이 유효하면 새로운 상품명 반영
  if (!isInvalid(cleanNew)) {
    return cleanNew;
  }
  // 2. 새로운 상품명이 유효하지 않은데 기존 상품명이 유효하다면 기존 상품명 보호
  if (!isInvalid(cleanExisting)) {
    return cleanExisting;
  }
  // 3. 둘 다 유효하지 않다면 새로운 상품명(또는 기본값) 리턴
  return cleanNew || cleanExisting || "상품명 확인 필요";
};

// 품질 점수 실시간 동적 재계산 헬퍼 (v0.5.2.2)
export const calculateDynamicQualityScore = (p: Partial<Product>): number => {
  let score = 0;
  
  // 1. 상품명 추출 여부 (+20)
  const name = p.name || '';
  if (name && !isPlaceholderProductName(name) && !isBrokenText(name)) {
    score += 20;
  }
  
  // 2. 소재 추출 여부 (+15)
  const infoText = p.info || '';
  const materialLine = infoText.split('\n').find(l => l.includes('소재/재질') || l.includes('소재') || l.includes('재질'));
  const isMaterialValid = materialLine && !materialLine.includes('명시 없음') && !materialLine.includes('확인되지 않음') && !materialLine.includes('제공 여부 확인 필요') && !materialLine.includes('상세페이지 내 명시 없음');
  if (isMaterialValid) {
    score += 15;
  }
  
  // 3. 사이즈 추출 여부 (+15)
  const sizeLine = infoText.split('\n').find(l => l.includes('사이즈/규격') || l.includes('사이즈') || l.includes('규격'));
  const isSizeValid = sizeLine && !sizeLine.includes('명시 없음') && !sizeLine.includes('확인되지 않음') && !sizeLine.includes('제공 여부 확인 필요') && !sizeLine.includes('상세페이지 내 명시 없음');
  if (isSizeValid) {
    score += 15;
  }
  
  // 4. 옵션/고시 정보 추출 여부 (+20)
  const hasOptionNotice = infoText.includes('[옵션/고시 정보]') || infoText.includes('[옵션 및 채널별 수집 고시 정보]');
  if (hasOptionNotice) {
    score += 20;
  }
  
  // 5. 이미지 후보 1개 이상 존재 (+10)
  const validImages = (p.imageCandidates || []).filter(c => c.status !== 'failed');
  if (validImages.length >= 1) {
    score += 10;
  }
  
  // 6. Unknowns 개수 기준 (+20)
  let unknowns = 0;
  const absenceKeywords = ["명시 없음", "확인되지 않음", "제공 여부 확인 필요", "상세페이지 내 명시 없음", "확인 필요", "별도 표기 없음"];
  infoText.split('\n').forEach(line => {
    if (line.includes(':')) {
      const val = line.substring(line.indexOf(':') + 1);
      if (absenceKeywords.some(kw => val.includes(kw))) {
        unknowns++;
      }
    }
  });
  
  if (unknowns === 0) score += 20;
  else if (unknowns <= 2) score += 16;
  else if (unknowns <= 4) score += 12;
  else if (unknowns === 5) score += 8;
  else score += 4;
  
  return score;
};

// 도매꾹 숫자 번호 추출 헬퍼
export const extractDomeggookItemNo = (url: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('domeggook.com')) {
      return null;
    }
    const params = parsed.searchParams;
    const no = params.get('no') || params.get('goodsNo') || params.get('itemNo');
    if (no && /^\d+$/.test(no)) {
      return no;
    }
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && /^\d+$/.test(lastPart)) {
      return lastPart;
    }
    return null;
  } catch (e) {
    // regex fallback
    const match = url.match(/domeggook\.com\/(?:main\/item\/itemView\.php\?(?:.*&)?(?:no|goodsNo|itemNo)=(\d+)|(\d+))/i);
    if (match) {
      return match[1] || match[2] || null;
    }
    const queryMatch = url.match(/[?&](?:no|goodsNo|itemNo)=(\d+)/i);
    if (queryMatch) return queryMatch[1];
    return null;
  }
};

// URL 정규화 헬퍼
export const normalizeProductUrl = (url: string): string => {
  if (!url) return '';
  try {
    const domeggookNo = extractDomeggookItemNo(url);
    if (domeggookNo) {
      return `https://domeggook.com/${domeggookNo}`;
    }
    const parsed = new URL(url);
    let host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let path = parsed.pathname.replace(/\/$/, '');
    const searchParams = new URLSearchParams(parsed.search);
    searchParams.sort();
    const search = searchParams.toString();
    return `${parsed.protocol}//${host}${path}${search ? '?' + search : ''}`;
  } catch (e) {
    return url.trim().toLowerCase();
  }
};

// 고유 키 생성 헬퍼
export const getProductKeys = (url: string): { productKey?: string; sourceKey?: string } => {
  if (!url) return {};
  const domeggookNo = extractDomeggookItemNo(url);
  if (domeggookNo) {
    const key = `domeggook:${domeggookNo}`;
    return { productKey: key, sourceKey: key };
  }
  const normalized = normalizeProductUrl(url);
  if (normalized) {
    return { sourceKey: normalized };
  }
  return {};
};

// 다단계 우선순위 매칭 엔진 구현
export const findMatchedProductIndex = (
  currentProducts: Product[],
  newProduct: {
    name?: string;
    url?: string;
    productCode?: string;
    sellerName?: string;
    category?: string;
  }
): number => {
  const newUrl = newProduct.url?.trim() || '';
  const newCode = newProduct.productCode?.trim() || '';
  const newName = newProduct.name?.trim() || '';

  const { productKey: newKey, sourceKey: newSrcKey } = getProductKeys(newUrl);
  const normalizedNewUrl = normalizeProductUrl(newUrl);

  // 1순위: productKey 또는 sourceKey가 정확히 같은 경우
  if (newKey || newSrcKey) {
    const idx = currentProducts.findIndex((p) => {
      const pUrl = p.url?.trim() || '';
      const { productKey: pKey, sourceKey: pSrcKey } = getProductKeys(pUrl);
      const canonicalKey = p.productKey || pKey;
      const canonicalSrcKey = p.sourceKey || pSrcKey;
      
      if (newKey && canonicalKey && newKey === canonicalKey) return true;
      if (newSrcKey && canonicalSrcKey && newSrcKey === canonicalSrcKey) return true;
      return false;
    });
    if (idx !== -1) return idx;
  }

  // 2순위: 정규화된 상품 URL이 정확히 같은 경우
  if (normalizedNewUrl) {
    const idx = currentProducts.findIndex((p) => {
      const pUrl = p.url?.trim() || '';
      return pUrl && normalizeProductUrl(pUrl) === normalizedNewUrl;
    });
    if (idx !== -1) return idx;
  }

  // 3순위: 상품 코드가 명확히 같은 경우 (대소문자 무관)
  if (newCode) {
    const idx = currentProducts.findIndex((p) => {
      return p.productCode && p.productCode.toLowerCase() === newCode.toLowerCase();
    });
    if (idx !== -1) return idx;
  }

  // 4순위: 정상 productName이 있고 placeholder가 아니며 URL 도메인도 유사한 경우
  if (newName && !isPlaceholderProductName(newName) && !isBrokenText(newName)) {
    const getDomain = (u?: string) => {
      if (!u) return null;
      try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch(e) { return null; }
    };
    const newDomain = getDomain(newUrl);

    const idx = currentProducts.findIndex((p) => {
      if (p.name !== newName) return false;
      if (isPlaceholderProductName(p.name) || isBrokenText(p.name)) return false;

      const pDomain = getDomain(p.url);
      if (newDomain && pDomain && newDomain !== pDomain) {
        return false;
      }
      return true;
    });
    if (idx !== -1) return idx;
  }

  // 5순위: productName이 placeholder이면 이름만으로는 절대 중복 처리하지 않음
  return -1;
};

export function useProductDB() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [collectionHistory, setCollectionHistory] = useState<CollectionHistory[]>([]);

  // 1. 상품 DB 로드
  useEffect(() => {
    const saved = localStorage.getItem('seller-ai-product-db');
    if (saved) {
      try {
        setProducts(JSON.parse(saved));
      } catch (e) {
        console.error('Product DB parsing failed', e);
      }
    }
  }, []);

  // 2. 고객 문의 수집함(Inbox) 및 에이전트 로그(Logs) 로드
  useEffect(() => {
    const savedInbox = localStorage.getItem('seller-ai-inbox-db');
    const savedLogs = localStorage.getItem('seller-ai-logs-db');

    if (savedInbox) {
      try {
        setInboxItems(JSON.parse(savedInbox));
      } catch (e) {
        setInboxItems(INITIAL_INBOX_ITEMS);
      }
    } else {
      setInboxItems(INITIAL_INBOX_ITEMS);
      localStorage.setItem('seller-ai-inbox-db', JSON.stringify(INITIAL_INBOX_ITEMS));
    }

    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        setLogs(INITIAL_LOGS);
      }
    } else {
      setLogs(INITIAL_LOGS);
      localStorage.setItem('seller-ai-logs-db', JSON.stringify(INITIAL_LOGS));
    }
  }, []);

  // 2.1 수집 이력 로드
  useEffect(() => {
    const savedHistory = localStorage.getItem('seller-ai-collection-history');
    if (savedHistory) {
      try {
        setCollectionHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Collection History parsing failed', e);
      }
    }
  }, []);

  const addCollectionHistory = (item: Omit<CollectionHistory, 'id' | 'collectedAt'>) => {
    const newHist: CollectionHistory = {
      ...item,
      id: `hist_${Date.now()}`,
      collectedAt: new Date().toLocaleString('ko-KR')
    };
    setCollectionHistory((prev) => {
      const updated = [newHist, ...prev];
      localStorage.setItem('seller-ai-collection-history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearCollectionHistory = () => {
    setCollectionHistory([]);
    localStorage.removeItem('seller-ai-collection-history');
  };

  // 3. 상품 정보 및 문의 누적 저장 (productCode 대응 확장)
  const saveProductAndInquiry = (
    name: string,
    url: string,
    info: string,
    customerInquiry: string,
    sellerMemo: string,
    csReply: string,
    productCode?: string, // 상품 코드 필드 추가
    imageCandidates?: { url: string; status: 'pending' | 'analyzed' | 'failed'; reason?: string; resultText?: string; score?: number; candidateType?: string }[]
  ) => {
    const finalNameForId = resolveSafeProductName(name);
    const productId = `prod_${finalNameForId}_${url}`.replace(/[^a-zA-Z0-9]/g, '_');
    
    setProducts((prevProducts) => {
      let productExists = false;
      const newInquiry: InquiryHistory = {
        id: Date.now().toString(),
        date: new Date().toLocaleString('ko-KR'),
        customerInquiry,
        sellerMemo,
        csReply,
      };

      const matchedIdx = findMatchedProductIndex(prevProducts, {
        name,
        url,
        productCode
      });

      let updatedProducts = prevProducts.map((p, idx) => {
        if (idx === matchedIdx) {
          productExists = true;

          // [덮어쓰기 방지 가드 적용]
          let finalName = resolveSafeProductName(name, p.name);

          // 상품명 복구 성공 시 reviewStatus 격리 보정
          let finalReviewStatus = p.reviewStatus || 'auto_draft';
          if (finalName !== '상품명 확인 필요' && !isBrokenText(finalName)) {
            if (finalReviewStatus === 'needs_review' && p.name === '상품명 확인 필요') {
              finalReviewStatus = 'auto_draft';
            }
          }

          const updatedProductTemp = {
            ...p,
            name: finalName,
            productName: finalName, // name과 productName 100% 동기화
            url: url || p.url,
            info: info || p.info,
            productCode: productCode || p.productCode, // 상품코드 보존/갱신
            imageCandidates: imageCandidates && imageCandidates.length > 0 ? imageCandidates : (p.imageCandidates || [])
          };
          const updatedScore = calculateDynamicQualityScore(updatedProductTemp);

          return {
            ...updatedProductTemp,
            reviewStatus: finalReviewStatus,
            updatedAt: new Date().toLocaleString('ko-KR'),
            inquiries: customerInquiry ? [newInquiry, ...p.inquiries] : p.inquiries,
            analysisProfile: p.analysisProfile || 'generic', // 기존 분석 프로필 보존
            qualityScore: updatedScore
          };
        }
        return p;
      });

      if (!productExists && (name || url || productCode)) {
        const finalName = resolveSafeProductName(name);
        
        let finalReviewStatus = 'auto_draft';
        if (finalName === '상품명 확인 필요' || isBrokenText(finalName)) {
          finalReviewStatus = 'needs_review';
        }

        const { productKey, sourceKey } = getProductKeys(url);

        const newProduct: Product = {
          productId,
          name: finalName,
          productName: finalName, // name과 productName 100% 동기화
          url: url || '',
          info,
          productCode: productCode || '',
          collectionSource: 'manual',
          collectedAt: new Date().toLocaleString('ko-KR'),
          createdAt: new Date().toLocaleString('ko-KR'),
          updatedAt: new Date().toLocaleString('ko-KR'),
          inquiries: customerInquiry ? [newInquiry] : [],
          imageCandidates: imageCandidates || [], // 이미지 후보 연동
          analysisProfile: 'generic', // 기본값 generic
          reviewStatus: finalReviewStatus as any,
          qualityScore: 100, // 임시 점수
          productKey,
          sourceKey
        };
        newProduct.qualityScore = calculateDynamicQualityScore(newProduct);
        updatedProducts = [newProduct, ...updatedProducts];
      }

      localStorage.setItem('seller-ai-product-db', JSON.stringify(updatedProducts));
      return updatedProducts;
    });
  };

  const findProduct = (name: string, url: string): Product | undefined => {
    if (!name && !url) return undefined;
    const idx = findMatchedProductIndex(products, { name, url });
    if (idx !== -1) return products[idx];
    return products.find(p => (name && p.name === name) || (url && p.url === url));
  };

  const clearProductDB = () => {
    setProducts([]);
    localStorage.removeItem('seller-ai-product-db');
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => {
      const updated = prev.filter(p => p.productId !== productId);
      localStorage.setItem('seller-ai-product-db', JSON.stringify(updated));
      return updated;
    });
  };

  // 상품 코드와 함께 내부 메모 업데이트 하도록 대응
  const updateInternalMemo = (productId: string, memo: string) => {
    setProducts((prev) => {
      const updated = prev.map(p => p.productId === productId ? { ...p, internalMemo: memo, updatedAt: new Date().toLocaleString('ko-KR') } : p);
      localStorage.setItem('seller-ai-product-db', JSON.stringify(updated));
      return updated;
    });
  };

  // DB 직접 저장 헬퍼 (상품 관리 탭용)
  const saveOnlyProduct = (p: Product) => {
    setProducts((prev) => {
      const exists = prev.find(item => item.productId === p.productId);
      
      // [덮어쓰기 방지 가드 적용]
      let finalName = resolveSafeProductName(p.name, exists?.name);

      // 상품명 복구 성공 시 reviewStatus 격리 보정
      let finalReviewStatus = p.reviewStatus || 'auto_draft';
      if (finalName !== '상품명 확인 필요' && !isBrokenText(finalName)) {
        if (finalReviewStatus === 'needs_review' && exists?.name === '상품명 확인 필요') {
          finalReviewStatus = 'auto_draft';
        }
      }

      const updatedProduct = {
        ...p,
        name: finalName,
        reviewStatus: finalReviewStatus as any,
        qualityScore: calculateDynamicQualityScore({ ...p, name: finalName })
      };

      let updated;
      if (exists) {
        updated = prev.map(item => item.productId === p.productId ? updatedProduct : item);
      } else {
        updated = [updatedProduct, ...prev];
      }
      localStorage.setItem('seller-ai-product-db', JSON.stringify(updated));
      return updated;
    });
  };

  const importProductDB = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        const isValid = parsed.every(p => p.productId !== undefined && p.name !== undefined);
        if (isValid) {
          setProducts(parsed);
          localStorage.setItem('seller-ai-product-db', JSON.stringify(parsed));
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Failed to import DB', e);
      return false;
    }
  };

  // --- CS 에이전트 수집함(Inbox) 및 로그 제어 함수군 ---

  // 문의 추가 (시뮬레이터 및 수동 추가 공용)
  const addInboxItem = (item: InboxItem) => {
    setInboxItems((prev) => {
      const updated = [item, ...prev];
      localStorage.setItem('seller-ai-inbox-db', JSON.stringify(updated));
      return updated;
    });
  };

  // 문의 일괄 추가 (CSV 일괄 업로드 공용)
  const addInboxItemsBulk = (items: InboxItem[]) => {
    setInboxItems((prev) => {
      const updated = [...items, ...prev];
      localStorage.setItem('seller-ai-inbox-db', JSON.stringify(updated));
      return updated;
    });
  };

  // 문의 업데이트 (수정, 복사, 보류, 매칭상품 지정 등)
  const updateInboxItem = (id: string, updates: Partial<InboxItem>) => {
    setInboxItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
      localStorage.setItem('seller-ai-inbox-db', JSON.stringify(updated));
      return updated;
    });
  };

  // 문의 삭제
  const deleteInboxItem = (id: string) => {
    setInboxItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem('seller-ai-inbox-db', JSON.stringify(updated));
      return updated;
    });
  };

  // 에이전트 로그 추가 (시뮬레이터 및 수동 로깅용)
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs((prev) => {
      const newLog: AgentLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type,
        message
      };
      const updated = [newLog, ...prev].slice(0, 100);
      localStorage.setItem('seller-ai-logs-db', JSON.stringify(updated));
      return updated;
    });
  };

  // 수집함 및 로그 초기화
  const clearInboxAndLogs = () => {
    setInboxItems([]);
    setLogs([]);
    localStorage.removeItem('seller-ai-inbox-db');
    localStorage.removeItem('seller-ai-logs-db');
  };

  // 가상 수집함 데이터 리셋 (기본 데이터 다시 세팅)
  const resetInboxAndLogs = () => {
    setInboxItems(INITIAL_INBOX_ITEMS);
    setLogs(INITIAL_LOGS);
    localStorage.setItem('seller-ai-inbox-db', JSON.stringify(INITIAL_INBOX_ITEMS));
    localStorage.setItem('seller-ai-logs-db', JSON.stringify(INITIAL_LOGS));
  };

  // 선택적 테스트 데이터 초기화 기능 구현
  const clearInboxSelective = (options: { demo: boolean; test: boolean; approved: boolean; all: boolean }) => {
    setInboxItems((prev) => {
      let updated = [...prev];
      if (options.all) {
        updated = [];
      } else {
        if (options.demo) {
          updated = updated.filter((item) => item.isDemo !== true);
        }
        if (options.test) {
          updated = updated.filter((item) => !(item.isDemo !== true && item.status !== 'approved'));
        }
        if (options.approved) {
          updated = updated.filter((item) => item.status !== 'approved');
        }
      }
      localStorage.setItem('seller-ai-inbox-db', JSON.stringify(updated));
      return updated;
    });
  };

  // 상품 일괄 추가 (CSV 대량 업로드용)
  const importProductsBulk = (newItems: Partial<Product>[]) => {
    let inserted = 0;
    let updated = 0;
    let needsReview = 0;
    let lowInfo = 0;
    let skipCount = 0;

    let currentProducts = [...products];

    newItems.forEach((item) => {
      const name = item.name?.trim() || '';
      const url = item.url?.trim() || '';
      const code = item.productCode?.trim() || '';
      const info = item.info?.trim() || '';
      const memo = item.internalMemo?.trim() || '';
      const category = item.category?.trim() || '';
      const sellerName = item.sellerName?.trim() || '';
      const collectionSource = item.collectionSource || 'csv-upload';
      const collectedAt = item.collectedAt || new Date().toLocaleString('ko-KR');

      // 필수 조건: 이름 또는 URL이 있어야 함
      if (!name && !url) return;

      // 1. learningStatus 자동 분류 적용
      let learningStatus: '미학습' | '정보 입력됨' | 'URL 분석 필요' | '이미지 분석 필요' | '학습 완료' | '정보 부족' = item.learningStatus || '정보 입력됨';
      if (!item.learningStatus) {
        if (!info && url) {
          learningStatus = 'URL 분석 필요';
        } else if (!info && !url) {
          learningStatus = '미학습';
        } else if (info && info.length < 15) {
          learningStatus = '정보 부족';
          lowInfo++;
        } else if (info && info.length >= 15) {
          learningStatus = '학습 완료';
        }
      } else if (item.learningStatus === '정보 부족') {
        lowInfo++;
      }

      // reviewStatus 설정 (기본은 auto_draft이나, 외부 주입 시 이를 활용)
      const reviewStatus = item.reviewStatus || 'auto_draft';

      // 2. 중복 판정 및 매칭 수행 (v0.5.2.3 개선된 다단계 엔진 연동)
      const matchedProductIdx = findMatchedProductIndex(currentProducts, {
        name,
        url,
        productCode: code,
        sellerName,
        category
      });

      // 중복 등록 방지 매칭 성공 시 ➔ 기존 상품 업데이트 또는 중복 스킵
      if (matchedProductIdx !== -1) {
        const matchedProduct = currentProducts[matchedProductIdx];
        
        // [덮어쓰기 방지 가드 적용]
        let finalName = resolveSafeProductName(name, matchedProduct.name);

        // 상품명 복구 성공 시 reviewStatus 격리 보정
        let finalReviewStatus = item.reviewStatus || matchedProduct.reviewStatus || 'auto_draft';
        if (finalName !== '상품명 확인 필요' && !isBrokenText(finalName)) {
          if (finalReviewStatus === 'needs_review' && matchedProduct.name === '상품명 확인 필요') {
            finalReviewStatus = 'auto_draft';
          }
        }

        // 기존 상품 정보와 신규 유입 상품 정보가 완벽히 동일한지 비교
        const isPerfectMatch = 
          matchedProduct.name === finalName &&
          matchedProduct.url === url &&
          matchedProduct.info === info &&
          (matchedProduct.productCode || '') === code &&
          (matchedProduct.sellerName || '') === sellerName &&
          (matchedProduct.category || '') === category &&
          (matchedProduct.internalMemo || '') === memo;

        if (isPerfectMatch) {
          skipCount++;
        } else {
          const tempUpdated = {
            ...matchedProduct,
            name: finalName,
            productName: finalName, // name과 productName 100% 동기화
            url: url || matchedProduct.url,
            info: info || matchedProduct.info,
            internalMemo: memo || matchedProduct.internalMemo,
            productCode: code || matchedProduct.productCode,
            category: category || matchedProduct.category,
            sellerName: sellerName || matchedProduct.sellerName,
            learningStatus: learningStatus,
            reviewStatus: finalReviewStatus as any,
            collectionSource: collectionSource,
            collectedAt: collectedAt,
            updatedAt: new Date().toLocaleString('ko-KR'),
            imageCandidates: item.imageCandidates || matchedProduct.imageCandidates || [], // 이미지 후보 업데이트/유지
            analysisProfile: item.analysisProfile || matchedProduct.analysisProfile || 'generic', // 분석 프로필 유지
          };
          tempUpdated.qualityScore = calculateDynamicQualityScore(tempUpdated);
          currentProducts[matchedProductIdx] = tempUpdated;
          updated++;
        }
      } else {
        // 4~5순위에 따라 productName이 placeholder인 경우는 이름만으로 절대 중복 처리하지 않음
        const onlyNameMatchIdx = isPlaceholderProductName(name) ? -1 : currentProducts.findIndex(
          (p) => p.name === name && !isPlaceholderProductName(p.name)
        );

        if (onlyNameMatchIdx !== -1) {
          // 중복 가능성 -> 기존 상품의 reviewStatus를 'needs_review'로 지정하며 업데이트
          const matchedProduct = currentProducts[onlyNameMatchIdx];

          // [덮어쓰기 방지 가드 적용]
          let finalName = resolveSafeProductName(name, matchedProduct.name);

          // 상품명 복구 성공 시 reviewStatus 격리 보정
          let finalReviewStatus = item.reviewStatus || 'auto_draft';
          if (finalName === '상품명 확인 필요' || isBrokenText(finalName)) {
            finalReviewStatus = 'needs_review';
          } else {
            if (finalReviewStatus === 'needs_review' && matchedProduct.name === '상품명 확인 필요') {
              finalReviewStatus = 'auto_draft';
            }
          }

          const tempUpdated = {
            ...matchedProduct,
            name: finalName,
            productName: finalName, // name과 productName 100% 동기화
            info: info || matchedProduct.info,
            internalMemo: memo || matchedProduct.internalMemo,
            category: category || matchedProduct.category,
            sellerName: sellerName || matchedProduct.sellerName,
            learningStatus: learningStatus,
            reviewStatus: finalReviewStatus as any,
            collectionSource: collectionSource,
            collectedAt: collectedAt,
            updatedAt: new Date().toLocaleString('ko-KR'),
            imageCandidates: item.imageCandidates || matchedProduct.imageCandidates || [], // 이미지 후보 업데이트/유지
            analysisProfile: item.analysisProfile || matchedProduct.analysisProfile || 'generic', // 분석 프로필 유지
          };
          tempUpdated.qualityScore = calculateDynamicQualityScore(tempUpdated);
          currentProducts[onlyNameMatchIdx] = tempUpdated;
          needsReview++;
          updated++; // 업데이트 처리
        } else {
          // 매칭되지 않는 경우 ➔ 신규 등록 (Insert)
          const finalName = resolveSafeProductName(name);
          const productId = `prod_${finalName || 'unnamed'}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          
          let finalReviewStatus = reviewStatus;
          if (finalName === '상품명 확인 필요' || isBrokenText(finalName)) {
            finalReviewStatus = 'needs_review';
          }

          const newProduct: Product = {
            productId,
            name: finalName,
            url: url,
            info: info,
            productCode: code,
            sellerName: sellerName,
            category: category,
            learningStatus: learningStatus,
            collectionSource: collectionSource,
            collectedAt: collectedAt,
            createdAt: new Date().toLocaleString('ko-KR'),
            updatedAt: new Date().toLocaleString('ko-KR'),
            inquiries: [],
            internalMemo: memo,
            reviewStatus: finalReviewStatus as any, // 외부 주입 상태 반영
            imageCandidates: item.imageCandidates || [], // 이미지 후보 추가
            analysisProfile: item.analysisProfile || 'generic', // 분석 프로필 기본 지정
            qualityScore: 100 // 기본 최고 점수
          };
          newProduct.qualityScore = calculateDynamicQualityScore(newProduct);
          currentProducts = [newProduct, ...currentProducts];
          inserted++;
        }
      }
    });

    setProducts(currentProducts);
    localStorage.setItem('seller-ai-product-db', JSON.stringify(currentProducts));

    return {
      total: newItems.length,
      inserted,
      updated,
      needsReview,
      lowInfo,
      skipCount
    };
  };

  return { 
    products, 
    saveProductAndInquiry, 
    findProduct, 
    clearProductDB,
    deleteProduct,
    updateInternalMemo,
    importProductDB,
    saveOnlyProduct,
    importProductsBulk, // 신규 등록 훅 추가
    collectionHistory,
    addCollectionHistory,
    clearCollectionHistory,
    
    // 신규 추가된 에이전트 수집함 상태 및 함수군
    inboxItems,
    logs,
    addInboxItem,
    addInboxItemsBulk,
    updateInboxItem,
    deleteInboxItem,
    addLog,
    clearInboxAndLogs,
    resetInboxAndLogs,
    clearInboxSelective
  };
}
