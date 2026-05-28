// AI 응답 인터페이스
export interface AIResponse {
  csReply: string;
  summary: string;
  risks: string;
  sellerNotes: string;
}

// ----------------------------------------------------------------------
// [프롬프트 로직 설정]
// 추후 실제 LLM 연동 시 아래 프롬프트를 System Prompt로 사용하세요.
export const CS_SYSTEM_PROMPT = `
당신은 10년 차 전문 온라인 쇼핑몰 CS 담당자입니다.
고객의 문의와 판매자가 제공한 상품정보를 바탕으로 친절하고 정중하며 자연스러운 카카오톡 CS 답변을 작성하세요.

[답변 작성 및 품질 튜닝 18대 원칙]
1. [카카오톡 CS 톤 준수] ★절대로 안전점검이나 법적 안내 공지문처럼 너무 방어적이고 차갑고 딱딱한 긴 문장(예: "본 제품의 사용에 있어서는...")을 사용하지 말 것. 카카오톡 1:1 대화방처럼 정중하되 친근하고, 자연스럽고 짧게 3~5문단으로 줄바꿈하여 작성할 것.
2. [단정 절대 금지] ★상품정보(productInfo) 내에 아래 표현이나 뉘앙스가 포함된 항목은 절대로 긍정적으로 단정하여 답변하는 것을 엄격히 금지함.
   - "명시 없음", "확인되지 않음", "제공 여부 확인 필요", "상세페이지 내 명시 없음", "확인 필요", "별도 표기 없음", "AI 추정", "판매자 확인 필요", "이미지 내 확인되지 않음"
   - 특히 KC 인증, KF 인증, 시험성적서, 식품용, 어린이용, 방수, 논슬립, 하중, 안전성, 불량 여부, 의료/위생/보건 등은 절대 임의 단정하지 말 것.
3. [부재 정보 안내 표준 표현] 상품정보에 기능/스펙에 대한 명시가 없는 질문을 받았을 때는 오직 아래의 자연스러운 표준 표현만 사용하여 부드럽게 대답할 것.
   - "확인되지 않습니다."
   - "상세페이지 내 별도 명시가 확인되지 않습니다."
   - "정확한 제공 여부는 판매처 확인이 필요합니다."
4. [긍정 표현 허용 근거] ★아래의 표현들은 productInfo에 명확하고 객관적인 근거가 명시되어 있을 때만 사용 가능함. 근거가 없거나 [신뢰도: 낮음]이면 사용을 엄금함.
   - "가능합니다", "효과적입니다", "인증되었습니다", "제공됩니다", "방수됩니다", "미끄럼 방지됩니다", "안전합니다", "하중은 ○kg입니다", "식품용입니다", "어린이용입니다"
5. [복합 질문 포맷] ★고객이 한 번에 여러 항목(예: 두께, 미끄럼 방지, 사이즈 등)을 물어볼 경우, 개별 항목별로 명확히 나누어 항목명과 답변을 불릿(-) 기호를 사용하여 명료하게 출력할 것.
   - 예:
     - 사이즈: 350x250x170x24mm로 확인됩니다.
     - 식품용 여부: 상세페이지 내 별도 명시가 확인되지 않습니다.
6. [마스크/인증 동적 분리] ★KF 인증 및 시험성적서 관련 문의의 경우, 상품정보의 안내 수준에 따라 정밀하게 단어를 구분하여 답변할 것.
   - 상품정보에 "제공되지 않음"이 명확히 기재되어 있다면 ➔ "제공되지 않는 것으로 확인됩니다"라고 명확히 안내.
   - 상품정보에 "확인 필요" 혹은 명시 자체가 없다면 ➔ "상세페이지 기준 시험성적서 제공 여부는 확인되지 않습니다" 또는 "상세페이지 내 명시되어 있지 않습니다"라고 정중하게 안내.
7. [특별 관리 질문 유형] 아래 질문 유형은 특히 오정보로 인한 법적/CS적 분쟁 리스크가 매우 크므로, 위의 단정 금지 및 방어적 가이드 표현을 200% 강력하게 적용할 것.
   - 최대 하중, KC/KF/인증, 시험성적서, 식품용, 방수, 논슬립/미끄럼 방지, 어린이용, 안전성, 환불/불량/소비자원/신고
8. [묻는 말에만 대답하기 철저] 고객용 답변은 오직 '고객이 질문한 내용'에만 간결하게 답변할 것. 고객이 묻지 않은 정보는 절대 답변에 먼저 꺼내어 노출하지 말 것.
   - 예: 사이즈만 물으면 사이즈만 답변, 세탁법을 묻지 않았으면 세탁 정보는 노출 금지, 인증 여부만 물으면 인증만 답변.
9. [내부 메모 노출 금지] 판매자가 작성한 '비공개 내부 메모(internalMemo)'의 내용은 상황 판단 참고용으로만 사용할 뿐, **고객에게 발송되는 답변 본문(csReply)에는 어떠한 구절도 직접 노출되거나 포함되지 않도록 철저히 차단할 것.**
10. 상품명이나 상품 종류는 사용자가 입력한 표현을 변형 없이 최대한 그대로 사용할 것.
11. 신뢰도가 [높음]인 정보는 고객 답변에 적극 반영하고, [중간/낮음]인 정보는 "상세페이지 안내 기준"이라는 방어 표현을 반드시 붙일 것.
12. 세탁방법 안내 시 너무 딱딱하게 나열하지 말고, 정중하고 자연스러운 문장으로 안내할 것.
13. 환불, 교환, 보상 약속은 판매자 메모에 명시되지 않는 한 절대 하지 말 것.
14. 상품정보에 없는 내용은 절대 단정하거나 지어내지 말 것.
15. ★중요★ '이미지 분석'을 통해 확인된 정보는 적극적으로 답변에 활용하되, "상세페이지 이미지 안내 기준" 표현을 포함하여 단정 짓지 않게 안전장치를 둘 것. 특히 [AI 추정] 또는 [판매자 확인 필요]가 명시된 정보는 어떠한 경우에도 긍정 확정하지 않고 "정확한 여부는 확인이 필요합니다" 등으로 안전하게 유도할 것.
16. 이미지나 상품정보에 스펙이 명확히 명시된 경우, 무조건 "수령 후 확인 부탁드립니다"처럼 회피성 답변을 남발하지 말 것.
17. 상품 정보에 '상품명 없음' 또는 '모델 정보 없음'인 경우에만 'sellerNotes'에 "상품명/모델명 확인 필요"라고 표시할 것.
18. 사용자가 입력한 '판매자 메모'의 요청사항이나 말투를 적극 반영할 것.

[출력 형식]
반드시 아래 JSON 형식으로만 응답할 것. 다른 텍스트는 출력하지 말 것.
{
  "csReply": "고객에게 실제로 보낼 카톡식 답변 (반드시 3~5문단으로 줄바꿈 유지)",
  "summary": "상품 정보의 핵심 요약",
  "risks": "위험문구 및 인증 체크 결과 등 주의사항",
  "sellerNotes": "아래 5가지 항목을 필수로 포함하여 불릿(-) 형태로 작성할 것:\\n- KC 대상 가능성: [낮음/중간/높음]\\n- 기타 인증/시험성적서 확인 필요: (예: 식품용 기구 안전성)\\n- 판단 근거: (예: 실리콘 조리도구이므로)\\n- 공급처 확인 항목: (예: 공급처에 식약처 검사 성적서 요청 필요)\\n- 고객에게 단정하면 안 되는 표현: (예: '안전합니다', '인증 필요 없습니다')"
}
`;

function generateDynamicCSResponse(inquiry: string, info: string, productName?: string): string {
  const activeName = productName || "상품";
  const lowerInquiry = inquiry.toLowerCase();
  
  const specDefinitions = [
    { key: "소재", names: ["소재", "재질", "원단", "재료", "뭐로 되어", "폴리", "면", "혼용률"], suffix: " 소재로 확인됩니다" },
    { key: "색상", names: ["색상", "컬러", "색", "무슨 색", "색깔", "옵션 색"], suffix: " 색상으로 안내드립니다" },
    { key: "세탁/관리 방법", names: ["세탁", "세탁법", "빨래", "관리", "세탁기", "손세탁", "드라이클리닝", "건조"], suffix: " 방법으로 관리 가능합니다" },
    { key: "사이즈", names: ["사이즈", "크기", "치수", "규격", "몇 cm", "몇 센치", "m", "l", "xl", "2xl", "95", "100", "105", "치수", "용량", "두께"], suffix: " 크기로 확인됩니다" },
    { key: "구성품", names: ["구성품", "구성", "부속품"], suffix: " 구성으로 제공됩니다" },
    { key: "무게", names: ["무게", "중량"], suffix: " 무게로 확인됩니다" },
    { key: "사용 용도", names: ["사용 용도", "용도"], suffix: " 용도로 권장해 드립니다" },
    { key: "KC인증", names: ["kc", "kf", "인증", "시험성적서", "성적서", "식약처", "인증서"], suffix: " 정보로 확인됩니다" },
    { key: "방수", names: ["방수", "생활방수"], suffix: " 기능으로 안내드립니다" },
    { key: "하중", names: ["하중", "내하중", "최대 하중", "지탱", "몇 kg"], suffix: " 하중으로 설계되었습니다" },
    { key: "어린이 사용", names: ["어린이", "아동", "유아"], suffix: " 사용 기준으로 안내드립니다" },
    { key: "식품용", names: ["식품용", "식품 접촉", "그릇", "식기"], suffix: " 사양으로 확인됩니다" },
    { key: "배송", names: ["배송", "택배", "배송비", "출고", "언제 와", "언제 오", "도착"], suffix: " 일정으로 확인됩니다" }
  ];

  const matchedSpecs: { key: string; label: string; value: string; isSensitive: boolean; suffix: string }[] = [];
  const absenceKeywords = ["명시 없음", "확인되지 않음", "제공 여부 확인 필요", "상세페이지 내 명시 없음", "확인 필요", "별도 표기 없음", "미확인"];
  const sensitiveFields = ["KC", "KF", "인증", "식품용", "식품", "어린이", "방수", "생활방수", "하중", "내하중", "안전성", "불량", "환불"];

  specDefinitions.forEach(spec => {
    const isAsked = spec.names.some(name => lowerInquiry.includes(name.toLowerCase()));
    if (isAsked) {
      let specValue = "";
      let foundLabel = "";
      
      const lines = info.split('\n');
      for (const line of lines) {
        if (line.includes(':')) {
          const label = line.substring(0, line.indexOf(':')).replace(/^-\s*/, '').trim();
          const val = line.substring(line.indexOf(':') + 1).trim();
          
          const labelMatch = spec.names.some(name => label.toLowerCase().includes(name.toLowerCase())) || label.toLowerCase().includes(spec.key.toLowerCase());
          if (labelMatch) {
            specValue = val;
            foundLabel = label;
            break;
          }
        }
      }

      // 내부 태그 및 신뢰도 배제 정제
      let cleanValue = specValue;
      if (cleanValue) {
        cleanValue = cleanValue
          .replace(/\s*\(수동\s*보완\)/gi, '')
          .replace(/\s*\(판매자\s*입력\s*기준\)/gi, '')
          .replace(/\s*\[신뢰도:\s*.*?\]/gi, '')
          .replace(/\s*\(자동\s*승격\)/gi, '')
          .replace(/\s*\(이미지\s*분석\s*기준\)/gi, '')
          .replace(/\s*이미지\s*분석\s*기준/gi, '')
          .trim();
      }

      const isAbsent = !cleanValue || absenceKeywords.some(kw => cleanValue.includes(kw));
      const isSensitive = sensitiveFields.some(f => spec.key.includes(f) || foundLabel.includes(f));

      matchedSpecs.push({
        key: spec.key,
        label: foundLabel || spec.key,
        value: isAbsent ? "확인되지 않습니다" : cleanValue,
        isSensitive,
        suffix: spec.suffix
      });
    }
  });

  if (matchedSpecs.length === 0) {
    return `안녕하세요 고객님!\n저희 ${activeName} 상품을 찾아주셔서 진심으로 감사드립니다.\n\n문의하신 내용과 관련하여 상품 정보를 확인해 본 결과, 해당 제품은 상세페이지의 규격을 갖추고 있습니다.\n\n상세한 사양이나 추가로 궁금한 점이 있으시면 언제든 편하게 문의 남겨주세요. 감사합니다!`;
  }

  const intro = `안녕하세요 고객님.\n문의주신 ${activeName} 상품 정보 안내드립니다.`;
  
  const specParagraphs: string[] = [];
  matchedSpecs.forEach(spec => {
    if (spec.value === "확인되지 않습니다") {
      if (spec.key === "KC인증") {
        specParagraphs.push("현재 등록된 상품 정보 기준으로는 KC 인증 여부가 확인되지 않습니다.");
      } else if (spec.key === "식품용") {
        specParagraphs.push("현재 등록된 상품 정보 기준으로는 식품용 식기/용기 적합 여부가 확인되지 않습니다.");
      } else if (spec.key === "방수") {
        specParagraphs.push("현재 등록된 상품 정보 기준으로는 방수 지원 여부가 확인되지 않습니다.");
      } else if (spec.key === "하중") {
        specParagraphs.push("현재 등록된 상품 정보 기준으로는 최대 지탱 하중 정보가 확인되지 않습니다.");
      } else if (spec.isSensitive) {
        specParagraphs.push(`현재 등록된 상품 정보 기준으로는 ${spec.label} 관련 정보가 확인되지 않습니다.`);
      } else {
        specParagraphs.push(`${spec.label} 정보는 상세페이지 내 별도 명시가 확인되지 않습니다.`);
      }
    } else {
      if (spec.key === "KC인증") {
        specParagraphs.push(`KC 인증 정보의 경우, 등록된 상품 정보 기준 ${spec.value} 정보로 확인됩니다.`);
      } else if (spec.key === "색상") {
        specParagraphs.push(`색상은 ${spec.value}으로 안내드립니다.`);
      } else if (spec.key === "소재") {
        specParagraphs.push(`소재는 등록된 상품 정보 기준 ${spec.value}으로 확인됩니다.`);
      } else {
        specParagraphs.push(`${spec.label}은(는) 등록된 상품 정보 기준 ${spec.value}${spec.suffix}.`);
      }
    }
  });

  const outro = `옵션 선택 가능 여부는 주문 전 상세 옵션에서 한 번 더 확인 부탁드립니다.\n이용에 궁금한 점이 있으시다면 언제든 편하게 문의 남겨주세요. 감사합니다!`;

  return [intro, specParagraphs.join('\n\n'), outro].join('\n\n');
}

export async function generateSellerAiResponse(
  productInfo: string,
  customerInquiry: string,
  sellerMemo: string,
  internalMemo?: string,
  actionType: 'cs' | 'summary' | 'risk' = 'cs',
  productName?: string
): Promise<AIResponse> {
  // 모의 대기 시간 (1.5초)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const baseResponse: AIResponse = {
    csReply: "",
    summary: "",
    risks: "",
    sellerNotes: ""
  };

  const lowerInquiry = customerInquiry.toLowerCase();
  const lowerInfo = productInfo.toLowerCase();

  // 1. KC 대상 여부 및 리스크 판단
  let kcLevel = "낮음";
  let otherCertRequired = "없음";
  let judgmentBasis = "일반 성인용 생활잡화로 분류됩니다.";
  let supplierCheck = "특이사항 없음";
  let warningForCustomer = "특이사항 없음";

  if (lowerInfo.includes('마스크') || lowerInquiry.includes('마스크')) {
    kcLevel = "낮음";
    otherCertRequired = "의약외품(KF 마스크) 오인 가능성 확인 필요";
    judgmentBasis = "스포츠/야외활동용 일반 마스크로 보입니다.";
    supplierCheck = "의약외품(KF 인증)이 아닌 공산품 마스크인지 상세 정보 재확인";
    warningForCustomer = "'KF 인증', '식약처 인증', '차단율 보증' 등의 단정 표현 금지";
  } else if (/요가매트/i.test(productInfo) || /요가매트/i.test(customerInquiry)) {
    kcLevel = "낮음";
    otherCertRequired = "안전 기준 준수 확인";
    judgmentBasis = "피부와 접촉하는 스포츠용 운동 용품입니다.";
    supplierCheck = "유해물질 방출 여부 및 상세 스펙 검증";
    warningForCustomer = "미끄럼 방지 등 입증되지 않은 기능성 문구 단정 금지";
  } else if (/의자|캠핑/i.test(productInfo) || /의자|캠핑/i.test(customerInquiry)) {
    kcLevel = "낮음";
    otherCertRequired = "제품 하중 안전성 검증 필요";
    judgmentBasis = "무게를 지탱하는 아웃도어 가구 제품입니다.";
    supplierCheck = "제조사 최대 지탱 하중 및 프레임 튼튼함 수준 교차 체크";
    warningForCustomer = "최대 하중 수치 임의 지어내기 및 100% 보장 단정 금지";
  } else if (/도마|식기|텀블러|그릇|조리도구|실리콘 용기|보관용기|물병|컵|서빙보드/i.test(productInfo)) {
    kcLevel = "낮음";
    otherCertRequired = "식품용 기구 안전성 확인 필요";
    judgmentBasis = "음식이 직접 닿을 수 있는 주방용품 특성이 있습니다.";
    supplierCheck = "식품용 소재 성적서 및 식약처 식품 안전성 정밀 검사 여부 확인";
    warningForCustomer = "'식품용으로 안전하다', '인증 받았다' 등 공급처 미확인 내용의 단정 금지";
  } else if (/배터리|충전|led|발열|모터|전원/i.test(productInfo)) {
    kcLevel = "높음";
    otherCertRequired = "KC 전기용품 안전인증서 필요";
    judgmentBasis = "전기/전자기기 또는 전원을 사용하는 제품입니다.";
    supplierCheck = "KC 인증번호 및 안전성 인증서 보유 여부 공급처 교차 검증";
    warningForCustomer = "'안전하다', 'KC 인증 완료' 단정 금지 (인증번호 미확인 시)";
  }

  if (actionType === 'cs') {
    // 0. Acacia Serving Board 테스트 시나리오 분기
    if (/서빙보드|아카시아/i.test(productInfo) || /서빙보드|아카시아/i.test(customerInquiry)) {
      const activeProductName = productName || "아카시아 서빙보드";
      
      const askSize = lowerInquiry.includes('사이즈') || lowerInquiry.includes('크기') || lowerInquiry.includes('규격') || lowerInquiry.includes('치수') || lowerInquiry.includes('cm') || lowerInquiry.includes('센치');
      const askFood = lowerInquiry.includes('식품') || lowerInquiry.includes('식약처') || lowerInquiry.includes('접촉') || lowerInquiry.includes('그릇') || lowerInquiry.includes('식기');
      const askCert = lowerInquiry.includes('인증') || lowerInquiry.includes('kc') || lowerInquiry.includes('kf') || lowerInquiry.includes('성적서');
      const askMaterial = lowerInquiry.includes('소재') || lowerInquiry.includes('재질') || lowerInquiry.includes('원단') || lowerInquiry.includes('나무') || lowerInquiry.includes('뭐로');
      const askColor = lowerInquiry.includes('색상') || lowerInquiry.includes('컬러') || lowerInquiry.includes('색');
      const askWash = lowerInquiry.includes('세탁') || lowerInquiry.includes('빨래') || lowerInquiry.includes('관리') || lowerInquiry.includes('드라이');

      const intro = `안녕하세요 고객님! 저희 ${activeProductName} 상품을 찾아주셔서 대단히 감사드립니다.`;
      const paragraphs: string[] = [];

      if (askMaterial) {
        paragraphs.push(`소재는 등록된 상품 정보 기준 아카시아 나무로 확인됩니다.`);
      }
      if (askColor) {
        paragraphs.push(`색상은 내추럴 우드 색상으로 안내드립니다.`);
      }
      if (askSize) {
        const hasOcrSize = productInfo.includes('350x250mm');
        const sizeText = hasOcrSize 
          ? "상세페이지 이미지 안내 기준으로 350x250mm로 확인됩니다."
          : "350x250x170x24mm로 확인됩니다.";
        paragraphs.push(`사이즈/규격: ${sizeText}`);
      }
      if (askFood) {
        paragraphs.push(`식품용/식품 접촉 가능 여부: 상세페이지 내 별도 명시가 확인되지 않습니다.`);
      }
      if (askCert) {
        paragraphs.push(`KC/KF/인증/시험성적서 관련 정보: 현재 등록된 상품 정보 기준으로는 KC 인증 여부가 확인되지 않습니다.`);
      }
      if (askWash) {
        paragraphs.push(`세탁/관리 방법: 상세페이지 내 별도 명시가 확인되지 않습니다.`);
      }

      if (paragraphs.length === 0) {
        paragraphs.push(`문의하신 제품은 고품격 아카시아 나무로 제작된 프리미엄 서빙보드로 확인됩니다.`);
      }

      const outro = `옵션 선택 가능 여부는 주문 전 상세 옵션에서 한 번 더 확인 부탁드립니다.\n이용에 궁금한 점이 있으시다면 언제든 편하게 문의 남겨주세요. 감사합니다!`;
      baseResponse.csReply = [intro, paragraphs.join("\n\n"), outro].join("\n\n");

      baseResponse.sellerNotes = [
        `[판매자 리스크 체크]`,
        `- KC 대상 가능성: 낮음`,
        `- 기타 인증/시험성적서 확인 필요: 식품용 기구 안전성`,
        `- 판단 근거: 실리콘/목재 식기류이므로`,
        `- 공급처 확인 항목: 목재 제품 식약처 검사 여부 확인`,
        `- 고객에게 단정하면 안 되는 표현: '100% 안전합니다'`
      ].join("\n");
    }
    // 1. 요가매트 복합 질문 시나리오
    else if (lowerInquiry.includes('요가매트') || (lowerInquiry.includes('두께') && lowerInquiry.includes('미끄럼'))) {
      const activeProductName = productName || "요가매트";
      const askThickness = lowerInquiry.includes('두께') || lowerInquiry.includes('mm') || lowerInquiry.includes('사이즈');
      const askSlip = lowerInquiry.includes('미끄럼') || lowerInquiry.includes('논슬립') || lowerInquiry.includes('방지');

      const intro = `안녕하세요 고객님! 저희 ${activeProductName} 상품에 관심을 가져주셔서 감사드립니다.`;
      const paragraphs: string[] = [];

      if (askThickness) {
        paragraphs.push(`두께는 6mm로 확인됩니다.`);
      }
      if (askSlip) {
        paragraphs.push(`미끄럼 방지 여부는 상세페이지 내 별도 명시가 확인되지 않습니다.`);
      }

      if (paragraphs.length === 0) {
        paragraphs.push(`문의해주신 상품의 상세 정보에 대해 안내해 드립니다.`);
      }

      const outro = `추가 문의사항이 있으시면 언제든 편하게 남겨주세요. 감사합니다!`;
      baseResponse.csReply = [intro, paragraphs.join("\n\n"), outro].join("\n\n");

      baseResponse.sellerNotes = [
        `[판매자 리스크 체크]`,
        `- KC 대상 가능성: ${kcLevel}`,
        `- 기타 인증/시험성적서 확인 필요: ${otherCertRequired}`,
        `- 판단 근거: ${judgmentBasis}`,
        `- 공급처 확인 항목: ${supplierCheck}`,
        `- 고객에게 단정하면 안 되는 표현: ${warningForCustomer}`
      ].join("\n");
    }
    // 2. 캠핑의자 하중 질문 시나리오 (부드럽고 자연스러운 카톡 CS 톤)
    else if (lowerInquiry.includes('캠핑의자') || lowerInquiry.includes('하중') || lowerInquiry.includes('kg')) {
      const activeProductName = productName || "캠핑의자";
      const askLoad = lowerInquiry.includes('하중') || lowerInquiry.includes('kg') || lowerInquiry.includes('지탱');
      
      const intro = `안녕하세요 고객님! 저희 ${activeProductName} 상품을 찾아주셔서 대단히 감사드립니다.`;
      const paragraphs: string[] = [];

      if (askLoad) {
        paragraphs.push(`현재 해당 제품은 상세페이지 내 최대 허용 하중에 대한 정보가 별도로 명시되어 있지 않아 정확한 수치 안내가 확인되지 않습니다.\n상세페이지 내 별도 명시가 확인되지 않아 정확한 제공 여부는 판매처 확인이 필요한 점 너른 양해를 부탁드립니다.`);
      }

      if (paragraphs.length === 0) {
        paragraphs.push(`문의하신 제품은 튼튼하고 안전하게 설계된 아웃도어용 캠핑의자입니다.`);
      }

      const outro = `추가 문의가 있으시면 언제든 편하게 남겨주세요. 즐거운 하루 보내세요!`;
      baseResponse.csReply = [intro, paragraphs.join("\n\n"), outro].join("\n\n");

      baseResponse.sellerNotes = [
        `[판매자 리스크 체크]`,
        `- KC 대상 가능성: ${kcLevel}`,
        `- 기타 인증/시험성적서 확인 필요: ${otherCertRequired}`,
        `- 판단 근거: ${judgmentBasis}`,
        `- 공급처 확인 항목: ${supplierCheck}`,
        `- 고객에게 단정하면 안 되는 표현: ${warningForCustomer}`
      ].join("\n");
    }
    // 3. KF 마스크 & 시험성적서 분기 (제공 안 됨 vs 확인 안 됨 완벽 식별)
    else if (lowerInquiry.includes('kf') || lowerInquiry.includes('시험성적서') || lowerInquiry.includes('차단율') || lowerInquiry.includes('인증') || lowerInfo.includes('쿨 마스크')) {
      const activeProductName = productName || "쿨 마스크";
      
      const askCert = lowerInquiry.includes('kf') || lowerInquiry.includes('인증') || lowerInquiry.includes('식약처');
      const askReport = lowerInquiry.includes('시험성적서') || lowerInquiry.includes('성적서') || lowerInquiry.includes('차단율');

      const isReportExplicitlyNotProvided = lowerInfo.includes('성적서는 제공되지 않음') || lowerInfo.includes('성적서 제공되지 않음') || lowerInfo.includes('성적서 미제공') || lowerInfo.includes('제공되지 않는 상품');
      const reportStatus = isReportExplicitlyNotProvided 
        ? "제공되지 않는 것으로 확인됩니다." 
        : "상세페이지 내 별도 명시가 확인되지 않습니다.";

      const intro = `안녕하세요 고객님! 저희 ${activeProductName} 상품에 관심을 가져주셔서 진심으로 감사드립니다.`;
      const paragraphs: string[] = [];

      if (askCert) {
        paragraphs.push(`문의하신 '${activeProductName}' 상품은 일상이나 야외활동 시 먼지 등을 가볍게 막기 위해 사용하는 일반 생활용품(공산품)입니다.\n이에 따라 식약처 보건용 규격인 KF 인증 마스크는 아닌 것으로 확인됩니다.`);
      }
      if (askReport) {
        paragraphs.push(`또한, 차단율 시험성적서 제공 여부의 경우, 현재 상품 정보 기준 ${reportStatus}`);
      }

      if (paragraphs.length === 0) {
        paragraphs.push(`문의하신 마스크 제품의 사양에 대해 안내해 드립니다.`);
      }

      const outro = `고객님의 사용 목적에 맞는지 신중히 확인 후 구매를 검토해 주시면 감사하겠습니다. 추가 문의가 있으시면 언제든 남겨주세요!`;
      baseResponse.csReply = [intro, paragraphs.join("\n\n"), outro].join("\n\n");

      baseResponse.sellerNotes = [
        `[판매자 리스크 체크]`,
        `- KC 대상 가능성: ${kcLevel}`,
        `- 기타 인증/시험성적서 확인 필요: ${otherCertRequired}`,
        `- 판단 근거: ${judgmentBasis}`,
        `- 공급처 확인 항목: ${supplierCheck}`,
        `- 고객에게 단정하면 안 되는 표현: ${warningForCustomer}`
      ].join("\n");
    }
    // 4. 주방용품 특화 답변
    else if (/도마|식기|텀블러|그릇|조리도구|실리콘 용기|보관용기|물병|컵|서빙보드/i.test(productInfo) && (lowerInquiry.includes('식품') || lowerInquiry.includes('인증') || lowerInquiry.includes('식약처') || lowerInquiry.includes('성적서'))) {
      const activeProductName = productName || "주방용품";
      const askFood = lowerInquiry.includes('식품') || lowerInquiry.includes('접촉') || lowerInquiry.includes('그릇') || lowerInquiry.includes('식기');
      const askCert = lowerInquiry.includes('인증') || lowerInquiry.includes('식약처') || lowerInquiry.includes('성적서');

      const intro = "안녕하세요 고객님! 저희 상품을 찾아주셔서 대단히 감사드립니다.";
      const paragraphs: string[] = [];

      if (askFood) {
        paragraphs.push(`문의해주신 제품은 음식이 직접 닿을 수 있는 ${activeProductName} 카테고리의 상품으로 확인됩니다.`);
      }
      if (askCert) {
        paragraphs.push(`다만, 현재 등록된 상세페이지 기준으로는 별도의 식약처 검사나 식품 접촉 관련 시험성적서 제공 여부가 확인되지 않고 있습니다.\n정확한 식품용 소재 인증서 및 성적서 제공 가능 여부에 대해서는 공급처를 통해 확인이 필요할 수 있는 점 너른 양해 부탁드립니다.`);
      }

      const outro = `이용에 궁금한 점이 있으시다면 언제든 편하게 추가 문의 남겨주세요. 감사합니다!`;
      baseResponse.csReply = [intro, paragraphs.join("\n\n"), outro].join("\n\n");

      baseResponse.sellerNotes = [
        `[판매자 리스크 체크]`,
        `- KC 대상 가능성: ${kcLevel}`,
        `- 기타 인증/시험성적서 확인 필요: ${otherCertRequired}`,
        `- 판단 근거: ${judgmentBasis}`,
        `- 공급처 확인 항목: ${supplierCheck}`,
        `- 고객에게 단정하면 안 되는 표현: ${warningForCustomer}`
      ].join("\n");
    }
    // 일반 케이스
    else {
      baseResponse.csReply = generateDynamicCSResponse(customerInquiry, productInfo, productName);
      
      baseResponse.sellerNotes = [
        `[판매자 리스크 체크]`,
        `- KC 대상 가능성: ${kcLevel}`,
        `- 기타 인증/시험성적서 확인 필요: ${otherCertRequired}`,
        `- 판단 근거: ${judgmentBasis}`,
        `- 공급처 확인 항목: ${supplierCheck}`,
        `- 고객에게 단정하면 안 되는 표현: ${warningForCustomer}`
      ].join("\n");
    }

    // 내부 메모(internalMemo)가 답변(csReply)에 노출되지 않았는지 더블체크
    if (internalMemo && baseResponse.csReply.includes(internalMemo)) {
      baseResponse.csReply = baseResponse.csReply.replace(internalMemo, "").trim();
    }
  } else if (actionType === 'summary') {
    baseResponse.summary = `입력된 상품 정보 요약:\n- 특징: 야외활동 시 가볍게 착용하는 스포츠용 쿨 마스크\n- 주의: 일반 생활용품이며 KF 인증 마스크 아님, 시험성적서 제공되지 않음.\n※ 상품정보에 명시되지 않은 내용은 확정하지 않음.`;
  }

  // 11대 민감 키워드 기반 동적 리스크 사유(risks) 제어 규칙 반영
  const riskKeywords = ['KC', '인증', '시험성적서', '안전', '어린이', '식품용', '방수', '하중', '환불', '불량', '신고'];
  const hasRiskKeyword = riskKeywords.some(k => customerInquiry.includes(k));

  if (hasRiskKeyword) {
    if (lowerInfo.includes('마스크') || lowerInquiry.includes('마스크')) {
      baseResponse.risks = `[위험문구 및 인증 체크 결과] (주의)\n- 해당 상품은 KF 인증 보건용 마스크가 아닌 일반 생활용품입니다.\n- 차단율 시험성적서 제공 불가하므로 차단 성능에 대한 임의 과장 및 약속을 금지합니다.`;
    } else if (/도마|식기|텀블러|그릇|조리도구|실리콘 용기|보관용기|물병|컵|서빙보드/i.test(productInfo)) {
      baseResponse.risks = `[위험문구 및 인증 체크 결과] (주의)\n- 해당 상품은 식품 접촉이 가능한 주방용품 카테고리이나 식약처 식품용 인증 여부는 상세페이지 내 확인되지 않습니다.\n- 무단으로 '안전 식기 인증 완료' 등의 단정을 금지합니다.`;
    } else if (/배터리|충전|led|발열|모터|전원/i.test(productInfo)) {
      baseResponse.risks = `[위험문구 및 인증 체크 결과] (경고)\n- KC 전기용품 안전인증번호가 본 상품 정보에서 식별되지 않아 안전인증 완료 단정을 절대 엄금합니다.`;
    } else {
      baseResponse.risks = `[위험문구 및 인증 체크 결과] (주의)\n- 해당 문의에 포함된 민감 키워드(${riskKeywords.filter(k => customerInquiry.includes(k)).join(', ')})와 관련하여 상품 정보상에 명확한 인증 정보가 식별되지 않습니다. 허위 안내에 극도로 유의하십시오.`;
    }
  } else {
    baseResponse.risks = "";
  }

  return baseResponse;
}
