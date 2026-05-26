import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { CS_SYSTEM_PROMPT, generateSellerAiResponse } from '@/lib/mockAi';

function detectInquiryIntent(inquiry: string): string {
  const q = inquiry.toLowerCase();
  
  const certKeywords = ["식품용", "인증", "인증서", "시험성적서", "검사성적서", "식약처", "kc", "안전성"];
  const specKeywords = ["사이즈", "무게", "크기", "중량", "색상", "컬러", "구성품", "소재", "재질", "원단", "옵션", "가격"];

  const hasCert = certKeywords.some(k => q.includes(k));
  const hasSpec = specKeywords.some(k => q.includes(k));

  if (hasCert && !hasSpec) return "certification_only";
  if (hasCert && hasSpec) return "composite";
  return "general";
}

function extractProductType(info: string): string {
  const lines = info.split('\n');
  const typeLine = lines.find(l => l.includes('상품 종류:'));
  if (typeLine) return typeLine.split('상품 종류:')[1].trim();
  
  const nameLine = lines.find(l => l.includes('상품명:'));
  if (nameLine) return nameLine.split('상품명:')[1].trim();

  return "주방용품";
}

function applyPostProcessing(result: any, inquiry: string, info: string, actionType: string) {
  if (actionType !== 'cs' || !result.csReply) return result;

  const intent = detectInquiryIntent(inquiry);
  if (intent === 'certification_only') {
    let productType = extractProductType(info);
    // 템플릿에 넣기 전에 상품명/종류에 붙은 신뢰도 태그 제거
    productType = productType.replace(/\[신뢰도:\s*(높음|중간|낮음)\]/g, '').trim();
    result.csReply = `안녕하세요 고객님. 문의주셔서 감사합니다.\n\n해당 상품은 음식이 직접 닿을 수 있는 ${productType}(으)로 확인됩니다.\n\n현재 상세페이지 기준으로는 식품용 인증서나 관련 시험성적서 제공 여부가 별도로 확인되지 않습니다.\n\n정확한 자료 제공 가능 여부는 공급처 확인이 필요할 수 있습니다. 감사합니다.`;
  } else {
    // 일반 csReply에서도 신뢰도 태그 무조건 제거
    result.csReply = result.csReply.replace(/\[신뢰도:\s*(높음|중간|낮음)\]/g, '').trim();
  }
  return result;
}

export async function POST(req: Request) {
  let body: any = {};
  
  try {
    body = await req.json();
    const { productInfo, customerInquiry, sellerMemo, internalMemo, actionType } = body;

    // API 키 확인 (없으면 mock 사용)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log('No OPENAI_API_KEY found, using mock fallback.');
      const mockResult = await generateSellerAiResponse(productInfo, customerInquiry, sellerMemo, internalMemo, actionType);
      return NextResponse.json(applyPostProcessing(mockResult, customerInquiry || '', productInfo || '', actionType || 'cs'));
    }

    // OpenAI 초기화
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const userPrompt = `
[상품 정보]
${productInfo || '없음'}

[상품별 내부 메모 (고객용 답변에 노출 금지)]
${internalMemo || '없음'}

[현재 입력한 판매자 메모]
${sellerMemo || '없음'}

[고객 문의]
${customerInquiry || '없음'}

[요청 액션]
${actionType} 에 특화된 정보 위주로 생성하되, 다른 항목도 가이드라인에 맞춰 채워주세요.
`;

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: CS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const jsonResult = JSON.parse(content);
    return NextResponse.json(applyPostProcessing(jsonResult, customerInquiry || '', productInfo || '', actionType || 'cs'));

  } catch (error) {
    console.error('OpenAI API Error:', error);
    // 에러 발생 시 기존 mock 로직으로 안전하게 Fallback
    try {
      const mockFallback = await generateSellerAiResponse(
        body.productInfo || '', 
        body.customerInquiry || '', 
        body.sellerMemo || '', 
        body.internalMemo || '',
        body.actionType || 'cs'
      );
      return NextResponse.json(mockFallback);
    } catch (fallbackError) {
      // 심각한 에러
      return NextResponse.json(
        { error: '서버 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  }
}
