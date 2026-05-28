import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';

const SYSTEM_PROMPT = `
당신은 온라인 커머스 상세페이지 이미지 분석 전문가이자 초정밀 Vision OCR 모델입니다.
주어진 이미지를 픽셀 단위로 정밀하게 분석하여 아래 6대 핵심 CS 항목을 추출해주세요.

[초정밀 분석 대상 및 작성 규칙]
1. 이미지에서 확인된 옵션별 사이즈:
   - ★중요★ 이 이미지는 쇼핑몰 상세페이지의 사이즈표/옵션표/규격표일 가능성이 매우 높습니다.
   - 이미지 안의 작은 글자와 표의 텍스트(숫자, 단위 등)를 최우선적으로 정밀 판독(OCR)하십시오.
   - 표나 텍스트에 규격이 여러 개 존재한다면, 절대 대표값 하나로 요약하거나 생략하지 말고 모든 행을 개별적으로 읽어와 빠짐없이 목록화하십시오.
   - "소형/1인용/2인용/3인 이상/4인 이상"과 같은 각 옵션명과 그에 대응하는 가로(폭)/세로(길이)/높이 스펙을 함께 짝지어 추출하십시오.
   - 숫자와 단위(cm, mm 등)를 훼손하거나 변경하지 말고 이미지에 적힌 그대로 보존하십시오.
   - 확실하게 식별되는 스펙 정보가 아예 없다면 "이미지에서 명확히 확인되지 않음"으로 처리하십시오.
2. 이미지에서 확인된 색상:
   - 이미지 텍스트나 사진으로 명확히 확인되는 색상 종류를 추출한다. (예: 그레이, 브라운 등)
   - 확인되지 않으면 "이미지에서 명확히 확인되지 않음"으로 처리한다.
3. 이미지에서 확인된 구성/옵션:
   - 제품 세트 구성이나 세부 구성품 옵션 정보를 추출한다.
   - 확인되지 않으면 "이미지에서 명확히 확인되지 않음"으로 처리한다.
4. 이미지에서 확인된 주의사항:
   - 세탁방법, 설치 시 유의점, 화기주의, 보관 주의사항 등 중요 경고 및 핵심 가이드를 추출한다.
   - 특히 세탁 문구(예: '세탁 시 30도 이하에서 세탁')가 감지되면 빼놓지 말고 주의사항으로 상세히 기록하십시오.
   - 확인되지 않으면 "이미지에서 명확히 확인되지 않음"으로 처리한다.
5. 이미지에서 확인된 Fabric/소재/혼용률:
   - ★매우 중요★ 이미지 내에 "Product Info", "Fabric", "Name", "Fit", "Laundry", "소재", "원단", "혼용률", "혼용 정보" 등의 영역이나 라벨이 있는지 초정밀 OCR 분석하십시오.
   - 특히 "Fabric:" 이나 "소재:" 라벨 근처에 퍼센트(%)가 포함된 섬유 조합(예: 비스코스 50%, 폴리에스터 34%, 나일론 10%, 울 6%)이 있다면 이를 반드시 캡처하십시오.
   - 만약 줄바꿈으로 혼용률 텍스트가 여러 줄에 나뉘어 있더라도, 하나의 혼용 정보이므로 연속된 텍스트로 완벽히 복원하여 한 줄로 합쳐서 작성하십시오.
     예: "Fabric:\n비스코스 50%, 폴리에스터 34%,\n나일론 10%, 울 6%" -> "비스코스 50%, 폴리에스터 34%, 나일론 10%, 울 6%"
   - 영문 라벨인 'Fabric'은 한국어 '소재/재질'로 해석하여 이에 상응하는 퍼센트 성분을 누락 없이 기록해 주십시오.
   - 확인되지 않으면 "이미지에서 명확히 확인되지 않음"으로 처리한다.
6. 이미지에서 확인된 Laundry/세탁 안내:
   - 이미지에 'Laundry' 또는 '세탁 안내' 등의 세탁 관련 영역이 있거나 주의사항에 세탁 지침이 있으면 이를 정밀 판독하십시오. (예: '30도 이하 세탁')
   - 확인되지 않으면 "이미지에서 명확히 확인되지 않음"으로 처리한다.

[신뢰도 표시 규칙]
추출된 각 세부 사항 끝에 다음과 같이 대괄호 형태의 신뢰도 지표를 꼭 붙여주십시오.
- 이미지 텍스트로 직접 명확히 확인된 정보 ➔ "[신뢰도: 중간]"으로 명시
- 정황이나 레이아웃으로 유추한 정보 ➔ "[신뢰도: 중간]" 또는 "[신뢰도: 낮음]"으로 명시
- 확실하지 않거나 누락된 정보 ➔ "이미지에서 명확히 확인되지 않음" 또는 "명확히 확인되지 않음"으로 표시

[출력 JSON 형식]
반드시 아래 키 명칭만 사용하는 단일 JSON 객체로만 응답하세요. 다른 마크다운이나 부가 설명은 일체 배제하십시오.
{
  "infoText": "[이미지 분석 보완 정보]\\n- 이미지에서 확인된 옵션별 사이즈:\\n  · 소형: 폭 90 x 길이 190 x 높이 140cm [신뢰도: 중간]\\n- 이미지에서 확인된 색상: 이미지에서 명확히 확인되지 않음\\n- 이미지에서 확인된 구성/옵션: 이미지에서 명확히 확인되지 않음\\n- 이미지에서 확인된 주의사항: 세탁 시 30도 이하에서 세탁 [신뢰도: 중간]\\n- 이미지에서 확인된 Fabric/소재/혼용률: 비스코스 50%, 폴리에스터 34%, 나일론 10%, 울 6% [신뢰도: 중간]\\n- 이미지에서 확인된 Laundry/세탁 안내: 30도 이하 세탁 [신뢰도: 중간]"
}
`;


async function splitImageIntoChunks(base64Data: string, mimeType: string): Promise<{ base64Data: string; mimeType: string }[]> {
  try {
    const base64Str = base64Data.split(',')[1] || base64Data;
    const buffer = Buffer.from(base64Str, 'base64');

    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    console.log(`[analyze-image split] Original image dimensions: ${width}x${height}`);

    if (width > 0 && height >= 2500) {
      const chunkHeight = 1500;
      const chunks: { base64Data: string; mimeType: string }[] = [];
      let currentTop = 0;
      let count = 0;

      while (currentTop < height && count < 4) {
        const extractHeight = Math.min(chunkHeight, height - currentTop);
        const chunkBuffer = await image
          .clone()
          .extract({ left: 0, top: currentTop, width: width, height: extractHeight })
          .toBuffer();

        const chunkBase64 = chunkBuffer.toString('base64');
        chunks.push({
          base64Data: `data:${mimeType};base64,${chunkBase64}`,
          mimeType: mimeType
        });

        currentTop += extractHeight;
        count++;
      }

      console.log(`[analyze-image split] Successfully split image into ${chunks.length} pieces.`);
      return chunks;
    }
  } catch (err) {
    console.warn('[analyze-image split] sharp partition error, using original single image:', err);
  }

  return [{ base64Data, mimeType }];
}

function mergeImageAnalysisResults(results: string[]): string {
  const sizeMap = new Map<string, string>();
  const cautions = new Set<string>();
  const colors = new Set<string>();
  const options = new Set<string>();
  const fabrics = new Set<string>();
  const laundries = new Set<string>();

  const isUnknown = (str: string) => str.includes('확인되지 않음') || str.includes('확인 필요') || str.includes('일부만 확인됨');

  for (const text of results) {
    const lines = text.split('\n');
    let section: 'sizes' | 'colors' | 'options' | 'cautions' | 'fabrics' | 'laundries' | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('확인된 옵션별 사이즈')) {
        section = 'sizes';
        continue;
      } else if (trimmed.includes('확인된 색상')) {
        section = 'colors';
        const val = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        if (val && !isUnknown(val)) colors.add(val);
        continue;
      } else if (trimmed.includes('확인된 구성/옵션')) {
        section = 'options';
        const val = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        if (val && !isUnknown(val)) options.add(val);
        continue;
      } else if (trimmed.includes('확인된 주의사항')) {
        section = 'cautions';
        const val = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        if (val && !isUnknown(val)) cautions.add(val);
        continue;
      } else if (trimmed.includes('확인된 Fabric/소재/혼용률')) {
        section = 'fabrics';
        const val = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        if (val && !isUnknown(val)) fabrics.add(val);
        continue;
      } else if (trimmed.includes('확인된 Laundry/세탁 안내')) {
        section = 'laundries';
        const val = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        if (val && !isUnknown(val)) laundries.add(val);
        continue;
      }

      if (section === 'sizes' && trimmed.startsWith('·')) {
        const cleanSize = trimmed.substring(1).trim();
        const colonIdx = cleanSize.indexOf(':');
        if (colonIdx !== -1) {
          const optName = cleanSize.substring(0, colonIdx).trim();
          const optValue = cleanSize.substring(colonIdx + 1).trim();

          const existing = sizeMap.get(optName);
          if (!existing || (isUnknown(existing) && !isUnknown(optValue))) {
            sizeMap.set(optName, `  · ${optName}: ${optValue}`);
          }
        }
      }
    }
  }

  const finalLines = [
    "[이미지 분석 보완 정보]",
    "- 이미지에서 확인된 옵션별 사이즈:"
  ];

  if (sizeMap.size > 0) {
    const sortedKeys = Array.from(sizeMap.keys());
    sortedKeys.forEach(k => {
      finalLines.push(sizeMap.get(k)!);
    });
  } else {
    finalLines.push("  · 이미지에서 명확히 확인되지 않음");
  }

  const finalColor = colors.size > 0 ? Array.from(colors).join(', ') : "이미지에서 명확히 확인되지 않음";
  finalLines.push(`- 이미지에서 확인된 색상: ${finalColor}`);

  const finalOption = options.size > 0 ? Array.from(options).join(', ') : "이미지에서 명확히 확인되지 않음";
  finalLines.push(`- 이미지에서 확인된 구성/옵션: ${finalOption}`);

  const finalCaution = cautions.size > 0 ? Array.from(cautions).join(', ') : "이미지에서 명확히 확인되지 않음";
  finalLines.push(`- 이미지에서 확인된 주의사항: ${finalCaution}`);

  const finalFabric = fabrics.size > 0 ? Array.from(fabrics).join(', ') : "이미지에서 명확히 확인되지 않음";
  finalLines.push(`- 이미지에서 확인된 Fabric/소재/혼용률: ${finalFabric}`);

  const finalLaundry = laundries.size > 0 ? Array.from(laundries).join(', ') : "이미지에서 명확히 확인되지 않음";
  finalLines.push(`- 이미지에서 확인된 Laundry/세탁 안내: ${finalLaundry}`);

  return finalLines.join('\n');
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ base64Data: string; mimeType: string }> {
  let targetUrl = imageUrl.trim();
  if (targetUrl.startsWith('//')) {
    targetUrl = `https:${targetUrl}`;
  }

  const urlListToTry: string[] = [];
  if (targetUrl.startsWith('http://')) {
    urlListToTry.push(targetUrl.replace('http://', 'https://'));
    urlListToTry.push(targetUrl);
  } else {
    urlListToTry.push(targetUrl);
  }

  let lastError: any = null;

  for (const urlToFetch of urlListToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

    try {
      const parsedUrl = new URL(urlToFetch);
      const res = await fetch(urlToFetch, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': parsedUrl.origin,
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP_${res.status}`);
      }

      const contentType = res.headers.get('content-type')?.trim() || '';

      // 1. MIME 검증 사전 차단 가드 (Vision API 전달 전)
      if (!contentType) {
        throw new Error("이미지 분석 실패: 유효한 이미지 응답이 아닙니다. (MIME type이 비어있음)");
      }

      const lowerMime = contentType.toLowerCase();

      // text/html, application/json, text/plain 가드
      if (lowerMime.includes('text/html')) {
        throw new Error("이미지 분석 실패: 외부 서버가 이미지 대신 HTML을 반환했습니다.");
      }
      if (lowerMime.includes('application/json')) {
        throw new Error("이미지 분석 실패: 외부 서버가 이미지 대신 JSON을 반환했습니다.");
      }
      if (lowerMime.includes('text/plain')) {
        throw new Error("이미지 분석 실패: 외부 서버가 이미지 대신 텍스트를 반환했습니다.");
      }
      if (lowerMime.includes('application/octet-stream')) {
        throw new Error("이미지 분석 실패: 이미지 파일이 아닙니다. MIME type: application/octet-stream");
      }

      // 허용 MIME 화이트리스트 검증 (image/jpeg, image/jpg, image/png, image/webp, image/gif)
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const isAllowed = allowedMimes.some(mime => lowerMime.startsWith(mime) || lowerMime.includes(mime));
      if (!isAllowed) {
        throw new Error(`이미지 분석 실패: 이미지 파일이 아닙니다. MIME type: ${contentType}`);
      }

      const buffer = await res.arrayBuffer();

      // 2. 파일 크기 및 본문 내용 적합성 가드
      if (buffer.byteLength === 0 || buffer.byteLength < 100) {
        throw new Error("이미지 분석 실패: 유효한 이미지 응답이 아닙니다. (파일 크기가 너무 작거나 비어있습니다)");
      }

      // HTML 응답 가드: 바이너리 초입에 <!DOCTYPE html>, <html, <script 등이 포함된 텍스트 차단
      const textSample = Buffer.from(buffer.slice(0, Math.min(buffer.byteLength, 1000))).toString('utf8').trim();
      const lowerSample = textSample.toLowerCase();
      if (
        lowerSample.startsWith('<!doctype html>') ||
        lowerSample.startsWith('<html') ||
        lowerSample.includes('<script') ||
        lowerSample.includes('<!doctype')
      ) {
        throw new Error("이미지 분석 실패: 외부 서버가 이미지 대신 HTML을 반환했습니다.");
      }

      const base64Data = Buffer.from(buffer).toString('base64');

      // OpenAI Vision API 동적 MIME 전달
      return {
        base64Data: `data:${contentType};base64,${base64Data}`,
        mimeType: contentType
      };
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastError = e;
      // 한 번이라도 MIME/크기 가드 에러가 나면 즉시 중단하고 에러 전파
      if (e.message && e.message.startsWith('이미지 분석 실패')) {
        throw e;
      }
    }
  }

  const errMsg = lastError?.message || '';
  if (errMsg.startsWith('이미지 분석 실패')) {
    throw lastError;
  }

  if (errMsg.includes('HTTP_403')) {
    throw new Error('외부 서버 차단 (403 Forbidden)');
  } else if (errMsg.includes('HTTP_404')) {
    throw new Error('이미지 다운로드 실패 (404 Not Found)');
  } else if (lastError?.name === 'AbortError') {
    throw new Error('다운로드 시간 초과 (Timeout)');
  } else {
    throw new Error(`이미지 접근 실패: ${errMsg || '연결 오류'}`);
  }
}

export async function POST(req: Request) {
  let isFallbackToDirectUrl = false;
  let finalImageUrl: string | undefined = undefined;
  let targetImageUrl: string | undefined = undefined;

  try {
    const { images, imageUrl } = await req.json();
    targetImageUrl = imageUrl;
    finalImageUrl = imageUrl;

    if ((!images || !Array.isArray(images) || images.length === 0) && !imageUrl) {
      return NextResponse.json({ error: '이미지가 제공되지 않았습니다.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const lowerUrl = (imageUrl || '').toLowerCase();

    const isAcaciaMock =
      lowerUrl.includes('picsum') ||
      lowerUrl.includes('acacia') ||
      lowerUrl.includes('board');

    const isDhtMock =
      lowerUrl.includes('dht-b2b.com') ||
      lowerUrl.includes('dht') ||
      lowerUrl.includes('cafe24') ||
      (lowerUrl.includes('web/upload') && !lowerUrl.includes('domeggook'));

    const isMockTarget = isAcaciaMock || isDhtMock;

    console.log('[analyze-image debug]', {
      imageUrl,
      hasApiKey: !!process.env.OPENAI_API_KEY,
      isMockTarget,
      includesDht: lowerUrl.includes('dht'),
      includesDhtB2b: lowerUrl.includes('dht-b2b.com'),
      includesCafe24: lowerUrl.includes('cafe24'),
      includesWebUpload: lowerUrl.includes('web/upload'),
      isDomeggook: lowerUrl.includes('domeggook')
    });

    if (!apiKey) {
      let mockResult = '';
      if (isDhtMock || isAcaciaMock) {
        mockResult = [
          "[이미지 분석 보완 정보]",
          "- 이미지에서 확인된 옵션별 사이즈:",
          "  · 소형: 폭 90 x 길이 190 x 높이 140cm [신뢰도: 중간]",
          "  · 1인용: 폭 100 x 길이 195 x 높이 130cm [신뢰도: 중간]",
          "  · 2인용: 폭 120 x 길이 200 x 높이 150cm [신뢰도: 중간]",
          "  · 3인 이상: 폭 150 x 길이 200 x 높이 150cm [신뢰도: 중간]",
          "  · 4인 이상: 이미지에서 일부만 확인됨",
          "- 이미지에서 확인된 색상: 이미지에서 명확히 확인되지 않음",
          "- 이미지에서 확인된 구성/옵션: 소형, 1인용, 2인용, 3인 이상 옵션 확인 [신뢰도: 중간]",
          "- 이미지에서 확인된 주의사항: 소형은 폭 90cm로 1인 침대 등 협소한 장소에서 사용 문구 확인 [신뢰도: 중간]"
        ].join("\n");
      } else {
        mockResult = [
          "[이미지 분석 보완 정보]",
          "- 이미지에서 확인된 옵션별 사이즈: 이미지에서 명확히 확인되지 않음",
          "- 이미지에서 확인된 색상: 이미지에서 명확히 확인되지 않음",
          "- 이미지에서 확인된 구성/옵션: 이미지에서 명확히 확인되지 않음",
          "- 이미지에서 확인된 주의사항: 이미지에서 명확히 확인되지 않음"
        ].join("\n");
      }
      return NextResponse.json({
        infoText: mockResult,
        mockMode: true,
        analysisSource: 'mock'
      });
    }

    let imageChunks: { base64Data: string; mimeType: string }[] = [];

    if (imageUrl) {
      try {
        const { base64Data, mimeType } = await fetchImageAsBase64(imageUrl);
        // sharp를 사용하여 긴 이미지를 조각 버퍼로 분할 (실패 시 원본 1장 자동 반입)
        imageChunks = await splitImageIntoChunks(base64Data, mimeType);
      } catch (err: any) {
        const prefetchErrorMsg = err.message || '';
        
        // 확실하게 이미지가 아닌 응답(MIME 가드 및 텍스트 검증 가드 통과 실패)인 경우에는 차단
        if (prefetchErrorMsg.startsWith('이미지 분석 실패')) {
          console.error('[analyze-image] prefetch blocked with clear format error:', err);
          return NextResponse.json({
            error: prefetchErrorMsg,
            code: 'IMAGE_VALIDATION_FAILED'
          }, { status: 400 });
        }

        // 그 외 단순 네트워크 실패, 403 Forbidden, 404 Not Found, Timeout, Referer 제한 등은
        // throw하지 않고 원본 imageUrl을 그대로 전달하는 fallback 수행
        console.warn('[analyze-image] prefetch failed, fallback to direct imageUrl:', err);
        finalImageUrl = imageUrl;
        isFallbackToDirectUrl = true;
      }
    }

    const openai = new OpenAI({ apiKey });
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    let mergedInfoText = '';

    if (imageUrl && !isFallbackToDirectUrl && imageChunks.length > 0) {
      // 1. 조각 이미지 병렬 Vision 호출 (각 조각은 detail: "high" 로 고해상도 전달)
      console.log(`[analyze-image] Starting parallel OCR for ${imageChunks.length} chunks.`);
      
      const analysisPromises = imageChunks.map(async (chunk, idx) => {
        try {
          const completion = await openai.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `상세 이미지 분할 조각 ${idx + 1}을 정밀 분석해 주세요.` },
                  { type: 'image_url', image_url: { url: chunk.base64Data, detail: 'high' } }
                ]
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1000,
          });

          const content = completion.choices[0].message.content;
          if (!content) return null;
          return JSON.parse(content);
        } catch (promiseErr) {
          console.warn(`[analyze-image chunk ${idx + 1}] Vision API call failed:`, promiseErr);
          return null; // 일부 실패하더라도 제외하고 머지하여 강인성 확보
        }
      });

      const chunkResults = await Promise.all(analysisPromises);
      const validResults = chunkResults.filter((r): r is { infoText: string } => r !== null && typeof r.infoText === 'string');

      if (validResults.length === 0) {
        throw new Error("모든 분할 이미지 조각의 Vision 분석에 실패했습니다.");
      }

      // 2. 조각별 결과 병합 및 지능형 중복 소거
      mergedInfoText = mergeImageAnalysisResults(validResults.map(r => r.infoText));
    } else {
      // 3. direct imageUrl fallback 또는 images 배열 분석 (단일 이미지 전송)
      const messageContent: any[] = [
        { type: 'text', text: '첨부된 상세페이지 이미지를 분석해주세요.' }
      ];

      if (imageUrl) {
        messageContent.push({
          type: 'image_url',
          image_url: { url: finalImageUrl || imageUrl, detail: 'high' }
        });
      } else if (images && Array.isArray(images)) {
        for (const imgBase64 of images) {
          messageContent.push({
            type: 'image_url',
            image_url: { url: imgBase64, detail: 'high' }
          });
        }
      }

      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: messageContent }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("Empty response from OpenAI");

      const jsonResult = JSON.parse(content);
      mergedInfoText = jsonResult.infoText || '';
    }

    return NextResponse.json({
      infoText: mergedInfoText,
      mockMode: false,
      analysisSource: 'openai'
    });

  } catch (error: any) {
    console.error('Image Analysis Error:', error);

    // direct imageUrl 우회 방식까지 실패한 경우, 더 구체적이고 사용자 친화적인 에러 메시지 제공
    if (targetImageUrl && isFallbackToDirectUrl) {
      return NextResponse.json({
        error: `이미지 후보는 정상 수집되었지만, 분석용 이미지 다운로드가 실패했습니다. 외부 이미지 서버가 접근을 제한했을 수 있습니다. (상세: ${error.message || 'Vision API 통신 오류'})`,
        code: 'IMAGE_DOWNLOAD_FAILED'
      }, { status: 400 });
    }

    return NextResponse.json({
      error: `Vision 분석 실패: ${error.message || '다시 시도해 주세요'}`,
      code: 'VISION_ANALYSIS_FAILED'
    }, { status: 500 });
  }
}
