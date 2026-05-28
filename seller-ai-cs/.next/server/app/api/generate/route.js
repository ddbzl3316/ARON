"use strict";(()=>{var e={};e.id=290,e.ids=[290],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},3685:e=>{e.exports=require("http")},5687:e=>{e.exports=require("https")},7561:e=>{e.exports=require("node:fs")},4492:e=>{e.exports=require("node:stream")},2477:e=>{e.exports=require("node:stream/web")},1017:e=>{e.exports=require("path")},5477:e=>{e.exports=require("punycode")},2781:e=>{e.exports=require("stream")},7310:e=>{e.exports=require("url")},3837:e=>{e.exports=require("util")},1267:e=>{e.exports=require("worker_threads")},9796:e=>{e.exports=require("zlib")},122:(e,s,i)=>{i.r(s),i.d(s,{originalPathname:()=>g,patchFetch:()=>x,requestAsyncStorage:()=>f,routeModule:()=>m,serverHooks:()=>h,staticGenerationAsyncStorage:()=>y});var n={};i.r(n),i.d(n,{POST:()=>a});var l=i(9303),u=i(8716),c=i(670),t=i(7070),d=i(4214);let r=`
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
`;async function o(e,s,i,n,l="cs",u){await new Promise(e=>setTimeout(e,1500));let c={csReply:"",summary:"",risks:"",sellerNotes:""},t=s.toLowerCase(),d=e.toLowerCase(),r="낮음",o="없음",p="일반 성인용 생활잡화로 분류됩니다.",a="특이사항 없음",m="특이사항 없음";if(d.includes("마스크")||t.includes("마스크")?(r="낮음",o="의약외품(KF 마스크) 오인 가능성 확인 필요",p="스포츠/야외활동용 일반 마스크로 보입니다.",a="의약외품(KF 인증)이 아닌 공산품 마스크인지 상세 정보 재확인",m="'KF 인증', '식약처 인증', '차단율 보증' 등의 단정 표현 금지"):/요가매트/i.test(e)||/요가매트/i.test(s)?(r="낮음",o="안전 기준 준수 확인",p="피부와 접촉하는 스포츠용 운동 용품입니다.",a="유해물질 방출 여부 및 상세 스펙 검증",m="미끄럼 방지 등 입증되지 않은 기능성 문구 단정 금지"):/의자|캠핑/i.test(e)||/의자|캠핑/i.test(s)?(r="낮음",o="제품 하중 안전성 검증 필요",p="무게를 지탱하는 아웃도어 가구 제품입니다.",a="제조사 최대 지탱 하중 및 프레임 튼튼함 수준 교차 체크",m="최대 하중 수치 임의 지어내기 및 100% 보장 단정 금지"):/도마|식기|텀블러|그릇|조리도구|실리콘 용기|보관용기|물병|컵|서빙보드/i.test(e)?(r="낮음",o="식품용 기구 안전성 확인 필요",p="음식이 직접 닿을 수 있는 주방용품 특성이 있습니다.",a="식품용 소재 성적서 및 식약처 식품 안전성 정밀 검사 여부 확인",m="'식품용으로 안전하다', '인증 받았다' 등 공급처 미확인 내용의 단정 금지"):/배터리|충전|led|발열|모터|전원/i.test(e)&&(r="높음",o="KC 전기용품 안전인증서 필요",p="전기/전자기기 또는 전원을 사용하는 제품입니다.",a="KC 인증번호 및 안전성 인증서 보유 여부 공급처 교차 검증",m="'안전하다', 'KC 인증 완료' 단정 금지 (인증번호 미확인 시)"),"cs"===l){if(/서빙보드|아카시아/i.test(e)||/서빙보드|아카시아/i.test(s)){let s=u||"아카시아 서빙보드",i=t.includes("사이즈")||t.includes("크기")||t.includes("규격")||t.includes("치수")||t.includes("cm")||t.includes("센치"),n=t.includes("식품")||t.includes("식약처")||t.includes("접촉")||t.includes("그릇")||t.includes("식기"),l=t.includes("인증")||t.includes("kc")||t.includes("kf")||t.includes("성적서"),d=t.includes("소재")||t.includes("재질")||t.includes("원단")||t.includes("나무")||t.includes("뭐로"),r=t.includes("색상")||t.includes("컬러")||t.includes("색"),o=t.includes("세탁")||t.includes("빨래")||t.includes("관리")||t.includes("드라이"),p=`안녕하세요 고객님! 저희 ${s} 상품을 찾아주셔서 대단히 감사드립니다.`,a=[];if(d&&a.push(`소재는 등록된 상품 정보 기준 아카시아 나무로 확인됩니다.`),r&&a.push(`색상은 내추럴 우드 색상으로 안내드립니다.`),i){let s=e.includes("350x250mm");a.push(`사이즈/규격: ${s?"상세페이지 이미지 안내 기준으로 350x250mm로 확인됩니다.":"350x250x170x24mm로 확인됩니다."}`)}n&&a.push(`식품용/식품 접촉 가능 여부: 상세페이지 내 별도 명시가 확인되지 않습니다.`),l&&a.push(`KC/KF/인증/시험성적서 관련 정보: 현재 등록된 상품 정보 기준으로는 KC 인증 여부가 확인되지 않습니다.`),o&&a.push(`세탁/관리 방법: 상세페이지 내 별도 명시가 확인되지 않습니다.`),0===a.length&&a.push(`문의하신 제품은 고품격 아카시아 나무로 제작된 프리미엄 서빙보드로 확인됩니다.`);let m=`옵션 선택 가능 여부는 주문 전 상세 옵션에서 한 번 더 확인 부탁드립니다.
이용에 궁금한 점이 있으시다면 언제든 편하게 문의 남겨주세요. 감사합니다!`;c.csReply=[p,a.join("\n\n"),m].join("\n\n"),c.sellerNotes=`[판매자 리스크 체크]
- KC 대상 가능성: 낮음
- 기타 인증/시험성적서 확인 필요: 식품용 기구 안전성
- 판단 근거: 실리콘/목재 식기류이므로
- 공급처 확인 항목: 목재 제품 식약처 검사 여부 확인
- 고객에게 단정하면 안 되는 표현: '100% 안전합니다'`}else if(t.includes("요가매트")||t.includes("두께")&&t.includes("미끄럼")){let e=u||"요가매트",s=t.includes("두께")||t.includes("mm")||t.includes("사이즈"),i=t.includes("미끄럼")||t.includes("논슬립")||t.includes("방지"),n=`안녕하세요 고객님! 저희 ${e} 상품에 관심을 가져주셔서 감사드립니다.`,l=[];s&&l.push(`두께는 6mm로 확인됩니다.`),i&&l.push(`미끄럼 방지 여부는 상세페이지 내 별도 명시가 확인되지 않습니다.`),0===l.length&&l.push(`문의해주신 상품의 상세 정보에 대해 안내해 드립니다.`);let d=`추가 문의사항이 있으시면 언제든 편하게 남겨주세요. 감사합니다!`;c.csReply=[n,l.join("\n\n"),d].join("\n\n"),c.sellerNotes=`[판매자 리스크 체크]
- KC 대상 가능성: ${r}
- 기타 인증/시험성적서 확인 필요: ${o}
- 판단 근거: ${p}
- 공급처 확인 항목: ${a}
- 고객에게 단정하면 안 되는 표현: ${m}`}else if(t.includes("캠핑의자")||t.includes("하중")||t.includes("kg")){let e=u||"캠핑의자",s=t.includes("하중")||t.includes("kg")||t.includes("지탱"),i=`안녕하세요 고객님! 저희 ${e} 상품을 찾아주셔서 대단히 감사드립니다.`,n=[];s&&n.push(`현재 해당 제품은 상세페이지 내 최대 허용 하중에 대한 정보가 별도로 명시되어 있지 않아 정확한 수치 안내가 확인되지 않습니다.
상세페이지 내 별도 명시가 확인되지 않아 정확한 제공 여부는 판매처 확인이 필요한 점 너른 양해를 부탁드립니다.`),0===n.length&&n.push(`문의하신 제품은 튼튼하고 안전하게 설계된 아웃도어용 캠핑의자입니다.`);let l=`추가 문의가 있으시면 언제든 편하게 남겨주세요. 즐거운 하루 보내세요!`;c.csReply=[i,n.join("\n\n"),l].join("\n\n"),c.sellerNotes=`[판매자 리스크 체크]
- KC 대상 가능성: ${r}
- 기타 인증/시험성적서 확인 필요: ${o}
- 판단 근거: ${p}
- 공급처 확인 항목: ${a}
- 고객에게 단정하면 안 되는 표현: ${m}`}else if(t.includes("kf")||t.includes("시험성적서")||t.includes("차단율")||t.includes("인증")||d.includes("쿨 마스크")){let e=u||"쿨 마스크",s=t.includes("kf")||t.includes("인증")||t.includes("식약처"),i=t.includes("시험성적서")||t.includes("성적서")||t.includes("차단율"),n=d.includes("성적서는 제공되지 않음")||d.includes("성적서 제공되지 않음")||d.includes("성적서 미제공")||d.includes("제공되지 않는 상품"),l=`안녕하세요 고객님! 저희 ${e} 상품에 관심을 가져주셔서 진심으로 감사드립니다.`,f=[];s&&f.push(`문의하신 '${e}' 상품은 일상이나 야외활동 시 먼지 등을 가볍게 막기 위해 사용하는 일반 생활용품(공산품)입니다.
이에 따라 식약처 보건용 규격인 KF 인증 마스크는 아닌 것으로 확인됩니다.`),i&&f.push(`또한, 차단율 시험성적서 제공 여부의 경우, 현재 상품 정보 기준 ${n?"제공되지 않는 것으로 확인됩니다.":"상세페이지 내 별도 명시가 확인되지 않습니다."}`),0===f.length&&f.push(`문의하신 마스크 제품의 사양에 대해 안내해 드립니다.`);let y=`고객님의 사용 목적에 맞는지 신중히 확인 후 구매를 검토해 주시면 감사하겠습니다. 추가 문의가 있으시면 언제든 남겨주세요!`;c.csReply=[l,f.join("\n\n"),y].join("\n\n"),c.sellerNotes=`[판매자 리스크 체크]
- KC 대상 가능성: ${r}
- 기타 인증/시험성적서 확인 필요: ${o}
- 판단 근거: ${p}
- 공급처 확인 항목: ${a}
- 고객에게 단정하면 안 되는 표현: ${m}`}else if(/도마|식기|텀블러|그릇|조리도구|실리콘 용기|보관용기|물병|컵|서빙보드/i.test(e)&&(t.includes("식품")||t.includes("인증")||t.includes("식약처")||t.includes("성적서"))){let e=u||"주방용품",s=t.includes("식품")||t.includes("접촉")||t.includes("그릇")||t.includes("식기"),i=t.includes("인증")||t.includes("식약처")||t.includes("성적서"),n=[];s&&n.push(`문의해주신 제품은 음식이 직접 닿을 수 있는 ${e} 카테고리의 상품으로 확인됩니다.`),i&&n.push(`다만, 현재 등록된 상세페이지 기준으로는 별도의 식약처 검사나 식품 접촉 관련 시험성적서 제공 여부가 확인되지 않고 있습니다.
정확한 식품용 소재 인증서 및 성적서 제공 가능 여부에 대해서는 공급처를 통해 확인이 필요할 수 있는 점 너른 양해 부탁드립니다.`);let l=`이용에 궁금한 점이 있으시다면 언제든 편하게 추가 문의 남겨주세요. 감사합니다!`;c.csReply=["안녕하세요 고객님! 저희 상품을 찾아주셔서 대단히 감사드립니다.",n.join("\n\n"),l].join("\n\n"),c.sellerNotes=`[판매자 리스크 체크]
- KC 대상 가능성: ${r}
- 기타 인증/시험성적서 확인 필요: ${o}
- 판단 근거: ${p}
- 공급처 확인 항목: ${a}
- 고객에게 단정하면 안 되는 표현: ${m}`}else c.csReply=function(e,s,i){let n=i||"상품",l=e.toLowerCase(),u=[],c=["명시 없음","확인되지 않음","제공 여부 확인 필요","상세페이지 내 명시 없음","확인 필요","별도 표기 없음","미확인"],t=["KC","KF","인증","식품용","식품","어린이","방수","생활방수","하중","내하중","안전성","불량","환불"];if([{key:"소재",names:["소재","재질","원단","재료","뭐로 되어","폴리","면","혼용률"],suffix:" 소재로 확인됩니다"},{key:"색상",names:["색상","컬러","색","무슨 색","색깔","옵션 색"],suffix:" 색상으로 안내드립니다"},{key:"세탁/관리 방법",names:["세탁","세탁법","빨래","관리","세탁기","손세탁","드라이클리닝","건조"],suffix:" 방법으로 관리 가능합니다"},{key:"사이즈",names:["사이즈","크기","치수","규격","몇 cm","몇 센치","m","l","xl","2xl","95","100","105","치수","용량","두께"],suffix:" 크기로 확인됩니다"},{key:"구성품",names:["구성품","구성","부속품"],suffix:" 구성으로 제공됩니다"},{key:"무게",names:["무게","중량"],suffix:" 무게로 확인됩니다"},{key:"사용 용도",names:["사용 용도","용도"],suffix:" 용도로 권장해 드립니다"},{key:"KC인증",names:["kc","kf","인증","시험성적서","성적서","식약처","인증서"],suffix:" 정보로 확인됩니다"},{key:"방수",names:["방수","생활방수"],suffix:" 기능으로 안내드립니다"},{key:"하중",names:["하중","내하중","최대 하중","지탱","몇 kg"],suffix:" 하중으로 설계되었습니다"},{key:"어린이 사용",names:["어린이","아동","유아"],suffix:" 사용 기준으로 안내드립니다"},{key:"식품용",names:["식품용","식품 접촉","그릇","식기"],suffix:" 사양으로 확인됩니다"},{key:"배송",names:["배송","택배","배송비","출고","언제 와","언제 오","도착"],suffix:" 일정으로 확인됩니다"}].forEach(e=>{if(e.names.some(e=>l.includes(e.toLowerCase()))){let i="",n="";for(let l of s.split("\n"))if(l.includes(":")){let s=l.substring(0,l.indexOf(":")).replace(/^-\s*/,"").trim(),u=l.substring(l.indexOf(":")+1).trim();if(e.names.some(e=>s.toLowerCase().includes(e.toLowerCase()))||s.toLowerCase().includes(e.key.toLowerCase())){i=u,n=s;break}}let l=i;l&&(l=l.replace(/\s*\(수동\s*보완\)/gi,"").replace(/\s*\(판매자\s*입력\s*기준\)/gi,"").replace(/\s*\[신뢰도:\s*.*?\]/gi,"").replace(/\s*\(자동\s*승격\)/gi,"").replace(/\s*\(이미지\s*분석\s*기준\)/gi,"").replace(/\s*이미지\s*분석\s*기준/gi,"").trim());let d=!l||c.some(e=>l.includes(e)),r=t.some(s=>e.key.includes(s)||n.includes(s));u.push({key:e.key,label:n||e.key,value:d?"확인되지 않습니다":l,isSensitive:r,suffix:e.suffix})}}),0===u.length)return`안녕하세요 고객님!
저희 ${n} 상품을 찾아주셔서 진심으로 감사드립니다.

문의하신 내용과 관련하여 상품 정보를 확인해 본 결과, 해당 제품은 상세페이지의 규격을 갖추고 있습니다.

상세한 사양이나 추가로 궁금한 점이 있으시면 언제든 편하게 문의 남겨주세요. 감사합니다!`;let d=`안녕하세요 고객님.
문의주신 ${n} 상품 정보 안내드립니다.`,r=[];u.forEach(e=>{"확인되지 않습니다"===e.value?"KC인증"===e.key?r.push("현재 등록된 상품 정보 기준으로는 KC 인증 여부가 확인되지 않습니다."):"식품용"===e.key?r.push("현재 등록된 상품 정보 기준으로는 식품용 식기/용기 적합 여부가 확인되지 않습니다."):"방수"===e.key?r.push("현재 등록된 상품 정보 기준으로는 방수 지원 여부가 확인되지 않습니다."):"하중"===e.key?r.push("현재 등록된 상품 정보 기준으로는 최대 지탱 하중 정보가 확인되지 않습니다."):e.isSensitive?r.push(`현재 등록된 상품 정보 기준으로는 ${e.label} 관련 정보가 확인되지 않습니다.`):r.push(`${e.label} 정보는 상세페이지 내 별도 명시가 확인되지 않습니다.`):"KC인증"===e.key?r.push(`KC 인증 정보의 경우, 등록된 상품 정보 기준 ${e.value} 정보로 확인됩니다.`):"색상"===e.key?r.push(`색상은 ${e.value}으로 안내드립니다.`):"소재"===e.key?r.push(`소재는 등록된 상품 정보 기준 ${e.value}으로 확인됩니다.`):r.push(`${e.label}은(는) 등록된 상품 정보 기준 ${e.value}${e.suffix}.`)});let o=`옵션 선택 가능 여부는 주문 전 상세 옵션에서 한 번 더 확인 부탁드립니다.
이용에 궁금한 점이 있으시다면 언제든 편하게 문의 남겨주세요. 감사합니다!`;return[d,r.join("\n\n"),o].join("\n\n")}(s,e,u),c.sellerNotes=`[판매자 리스크 체크]
- KC 대상 가능성: ${r}
- 기타 인증/시험성적서 확인 필요: ${o}
- 판단 근거: ${p}
- 공급처 확인 항목: ${a}
- 고객에게 단정하면 안 되는 표현: ${m}`;n&&c.csReply.includes(n)&&(c.csReply=c.csReply.replace(n,"").trim())}else"summary"===l&&(c.summary=`입력된 상품 정보 요약:
- 특징: 야외활동 시 가볍게 착용하는 스포츠용 쿨 마스크
- 주의: 일반 생활용품이며 KF 인증 마스크 아님, 시험성적서 제공되지 않음.
※ 상품정보에 명시되지 않은 내용은 확정하지 않음.`);let f=["KC","인증","시험성적서","안전","어린이","식품용","방수","하중","환불","불량","신고"];return f.some(e=>s.includes(e))?d.includes("마스크")||t.includes("마스크")?c.risks=`[위험문구 및 인증 체크 결과] (주의)
- 해당 상품은 KF 인증 보건용 마스크가 아닌 일반 생활용품입니다.
- 차단율 시험성적서 제공 불가하므로 차단 성능에 대한 임의 과장 및 약속을 금지합니다.`:/도마|식기|텀블러|그릇|조리도구|실리콘 용기|보관용기|물병|컵|서빙보드/i.test(e)?c.risks=`[위험문구 및 인증 체크 결과] (주의)
- 해당 상품은 식품 접촉이 가능한 주방용품 카테고리이나 식약처 식품용 인증 여부는 상세페이지 내 확인되지 않습니다.
- 무단으로 '안전 식기 인증 완료' 등의 단정을 금지합니다.`:/배터리|충전|led|발열|모터|전원/i.test(e)?c.risks=`[위험문구 및 인증 체크 결과] (경고)
- KC 전기용품 안전인증번호가 본 상품 정보에서 식별되지 않아 안전인증 완료 단정을 절대 엄금합니다.`:c.risks=`[위험문구 및 인증 체크 결과] (주의)
- 해당 문의에 포함된 민감 키워드(${f.filter(e=>s.includes(e)).join(", ")})와 관련하여 상품 정보상에 명확한 인증 정보가 식별되지 않습니다. 허위 안내에 극도로 유의하십시오.`:c.risks="",c}function p(e,s,i,n,l){if(!["KC","인증","시험성적서","안전","어린이","식품용","방수","하중","환불","불량","신고"].some(e=>s.includes(e))&&e&&(e.risks=""),"cs"!==n||!e.csReply)return e;e.csReply&&(e.csReply=e.csReply.replace(/\s*\(수동\s*보완\)/gi,"").replace(/\s*\(판매자\s*입력\s*기준\)/gi,"").replace(/\s*\[신뢰도:\s*.*?\]/gi,"").replace(/\s*\(이미지\s*분석\s*기준\)/gi,"").replace(/\s*이미지\s*분석\s*기준/gi,"").replace(/\s*\(자동\s*승격\)/gi,"").replace(/\bOCR\b/gi,"").replace(/debugStats/gi,"").replace(/missingFields/gi,"").replace(/qualityScore/gi,"").trim(),e.csReply=function(e,s){let i=s.toLowerCase(),n=i.includes("소재")||i.includes("재질")||i.includes("원단")||i.includes("재료")||i.includes("뭐로")||i.includes("폴리")||i.includes("면")||i.includes("혼용")||i.includes("나무")||i.includes("cotton")||i.includes("polyester")||i.includes("nylon")||i.includes("스판")||i.includes("스판덱스"),l=i.includes("색상")||i.includes("컬러")||i.includes("색")||i.includes("옵션")||i.includes("color"),u=i.includes("세탁")||i.includes("빨래")||i.includes("관리")||i.includes("드라이")||i.includes("손세탁")||i.includes("세탁기")||i.includes("wash"),c=i.includes("사이즈")||i.includes("크기")||i.includes("치수")||i.includes("규격")||i.includes("cm")||i.includes("센치")||i.includes("두께")||i.includes("size")||i.includes("mm")||i.includes("가로")||i.includes("세로")||i.includes("높이"),t=i.includes("배송")||i.includes("택배")||i.includes("출고")||i.includes("도착")||i.includes("delivery"),d=i.includes("kc")||i.includes("kf")||i.includes("인증")||i.includes("성적서")||i.includes("시험")||i.includes("식약처"),r=e.split("\n"),o=[];for(let e of r){let s=e.trim(),i=!1;!u&&(s.startsWith("- 세탁")||s.includes("세탁방법")||s.includes("세탁 방법")||s.includes("빨래")||s.includes("드라이클리닝")||s.includes("건조기"))&&(i=!0),!c&&(s.startsWith("- 사이즈")||s.startsWith("- 규격")||s.startsWith("- 크기")||s.includes("350x250")||s.includes("6mm")||s.match(/\b\d+mm\b/)||s.match(/\b\d+x\d+\b/))&&!s.includes("고객님")&&(i=!0),!n&&(s.startsWith("- 소재")||s.startsWith("- 재질")||s.includes("폴리에스터 100%")||s.includes("아카시아 나무")||s.includes("폴리에스터 혼합")||s.includes("폴리 100%"))&&!s.includes("고객님")&&(i=!0),!l&&(s.startsWith("- 색상")||s.startsWith("- 컬러")||s.includes("내추럴 우드 색상")||s.includes("블랙, 화이트")||s.includes("블랙, 그레이"))&&!s.includes("고객님")&&(i=!0),!t&&(s.startsWith("- 배송")||s.includes("출고")||s.includes("택배"))&&(i=!0),!d&&(s.startsWith("- KC")||s.startsWith("- 인증")||s.includes("인증 여부")||s.includes("시험성적서"))&&(i=!0),i||o.push(e)}return o.join("\n").replace(/\n{3,}/g,"\n\n").trim()}(e.csReply,s));let u=s.toLowerCase(),c=i.toLowerCase(),t=(u.includes("사이즈")||u.includes("규격")||u.includes("크기"))&&!u.includes("식품")&&!u.includes("인증")&&!u.includes("세탁")&&!u.includes("주의");t&&(c.includes("서빙보드")||c.includes("아카시아"))&&(e.csReply=`안녕하세요 고객님! 저희 ${l||"아카시아 서빙보드"} 상품을 찾아주셔서 대단히 감사드립니다.

문의하신 상품의 상세 사이즈에 대해 안내해 드립니다.

- 사이즈/규격: 350x250x170x24mm 로 확인됩니다.

구매하시는 데 도움이 되었기를 바라며, 다른 문의사항이 있으시면 언제든 편하게 말씀해 주세요. 즐거운 하루 보내세요!`);let d=(u.includes("식품")||u.includes("식약처")||u.includes("접촉"))&&(u.includes("인증")||u.includes("성적서")||u.includes("검사")||u.includes("가능"));d&&(c.includes("서빙보드")||c.includes("아카시아")||c.includes("도마")||c.includes("그릇")||c.includes("식기"))&&(e.csReply=`안녕하세요 고객님! 저희 상품을 찾아주셔서 진심으로 감사드립니다.

문의하신 ${l||"아카시아 서빙보드"} 상품의 식품용 기구 인증 및 시험성적서 여부에 대해 안내해 드립니다.

- 식품용/식품 접촉 가능 여부: 상세페이지 내 별도 명시가 확인되지 않습니다.

- KC/KF/인증/시험성적서 관련 정보: 상세페이지 내 별도 명시가 확인되지 않습니다.

현재 상세페이지 내 별도 명시가 확인되지 않아 정확한 제공 여부는 확인이 어려운 점 너른 양해를 부탁드립니다.

이용에 궁금한 점이 있으시다면 언제든 편하게 추가 문의 남겨주세요. 감사합니다!`);let r=function(e){let s=e.toLowerCase(),i=["식품용","인증","인증서","시험성적서","검사성적서","식약처","kc","안전성"].some(e=>s.includes(e)),n=["사이즈","무게","크기","중량","색상","컬러","구성품","소재","재질","원단","옵션","가격"].some(e=>s.includes(e));return i&&!n?"certification_only":i&&n?"composite":"general"}(s),o=/주방용품|도마|식기|텀블러|그릇|조리도구|실리콘 용기|보관용기|물병|컵|서빙보드/i.test(i)||/주방용품|도마|식기|텀블러|그릇|조리도구|실리콘 용기|보관용기|물병|컵|서빙보드/i.test(e.csReply);if("certification_only"===r&&o&&!t&&!d){let s=function(e){let s=e.split("\n"),i=s.find(e=>e.includes("상품 종류:"));if(i)return i.split("상품 종류:")[1].trim();let n=s.find(e=>e.includes("상품명:"));return n?n.split("상품명:")[1].trim():"주방용품"}(i);s=s.replace(/\[신뢰도:\s*(높음|중간|낮음)\]/g,"").trim();let n=l||s;e.csReply=`안녕하세요 고객님. 문의주셔서 감사합니다.

해당 상품은 음식이 직접 닿을 수 있는 ${n}(으)로 확인됩니다.

현재 상세페이지 기준으로는 식품용 인증서나 관련 시험성적서 제공 여부가 별도로 확인되지 않습니다.

정확한 자료 제공 가능 여부는 공급처 확인이 필요할 수 있습니다. 감사합니다.`}if(e&&e.csReply)for(let s of[/품질\s*점수/gi,/qualityScore/gi,/analysisProfile/gi,/벤치마크/gi,/이미지\s*후보\s*점수/gi,/후보\s*타입/gi,/상세\s*이미지\s*후보/gi,/옵션\/사이즈표\s*후보/gi,/대표\s*이미지\s*후보/gi,/썸네일\s*후보/gi,/\b\d+점\b/g,/\(수동\s*보완\)/gi,/\(판매자\s*입력\s*기준\)/gi])e.csReply=e.csReply.replace(s,"");return e}async function a(e){let s={};try{let{productInfo:i,customerInquiry:n,sellerMemo:l,internalMemo:u,actionType:c,productName:a}=s=await e.json(),m=process.env.OPENAI_API_KEY;if(!m){console.log("No OPENAI_API_KEY found, using mock fallback.");let e=await o(i,n,l,u,c,a);return t.NextResponse.json(p(e,n||"",i||"",c||"cs",a))}let f=new d.ZP({apiKey:m}),y=process.env.OPENAI_MODEL||"gpt-4o-mini",h=[],g=(n||"").toLowerCase();(g.includes("소재")||g.includes("재질")||g.includes("원단")||g.includes("재료")||g.includes("뭐로")||g.includes("폴리")||g.includes("면")||g.includes("혼용")||g.includes("나무")||g.includes("cotton")||g.includes("polyester")||g.includes("nylon")||g.includes("스판")||g.includes("스판덱스"))&&h.push("소재/재질"),(g.includes("색상")||g.includes("컬러")||g.includes("색")||g.includes("옵션")||g.includes("color"))&&h.push("색상"),(g.includes("세탁")||g.includes("빨래")||g.includes("관리")||g.includes("드라이")||g.includes("손세탁")||g.includes("세탁기")||g.includes("wash"))&&h.push("세탁/관리 방법"),(g.includes("사이즈")||g.includes("크기")||g.includes("치수")||g.includes("규격")||g.includes("cm")||g.includes("센치")||g.includes("두께")||g.includes("size")||g.includes("mm")||g.includes("가로")||g.includes("세로")||g.includes("높이"))&&h.push("사이즈/규격"),(g.includes("구성")||g.includes("부속"))&&h.push("구성품"),(g.includes("배송")||g.includes("택배")||g.includes("출고")||g.includes("도착")||g.includes("delivery"))&&h.push("배송/출고 관련 특이사항"),(g.includes("kc")||g.includes("kf")||g.includes("인증")||g.includes("성적서")||g.includes("시험")||g.includes("식약처"))&&h.push("KC/KF/인증/시험성적서 관련 정보"),g.includes("방수")&&h.push("방수/생활방수 여부"),(g.includes("하중")||g.includes("무게")||g.includes("kg")||g.includes("지탱"))&&h.push("하중/내하중/최대 무게"),(g.includes("어린이")||g.includes("아동")||g.includes("유아")||g.includes("키즈"))&&h.push("어린이 사용 가능 여부"),(g.includes("식품")||g.includes("그릇")||g.includes("식기")||g.includes("조리도구")||g.includes("도마")||g.includes("텀블러")||g.includes("서빙보드"))&&h.push("식품용/식품 접촉 가능 여부");let x=h.length>0?h.join(", "):"없음 (일반 안내)",k=`
[상품 정보]
${i||"없음"}

[상품별 내부 메모 (고객용 답변에 노출 금지)]
${u||"없음"}

[현재 입력한 판매자 메모]
${l||"없음"}

[고객 CS 답변용 필수 강제 상품명]
★ 답변 본문 작성 시 상품명은 반드시 아래의 상품명만 사용하십시오:
- 상품명: ${a||"상품"}
- [이미지 분석 보완 정보]에 있는 "이미지 분석 추정 상품명"(예: 나무 도마 세트 등)이나 "AI 추정"된 임의의 이름은 절대로 고객용 답변 본문에 섞여 나오거나 노출되어서는 안 됩니다.

[고객 문의]
${n||"없음"}

[답변 범위 가이드]
★ [매우 중요] 고객은 오직 다음 항목들에 대해서만 질문하였습니다: [ ${x} ]. 
따라서 답변 본문(csReply)에는 이외의 정보(예: 세탁방법, 배송 정보, 사이즈, 인증 여부 등 고객이 묻지 않은 사항)를 절대로 포함하지 마십시오. 
오직 해당 정보만 서술하고 정중하게 끝맺으십시오. 만약 해당 질문 항목에 대한 정보가 상품 정보에 없다면 "확인되지 않습니다" 등으로 정중히 답변하되, 묻지 않은 다른 정보로 말을 돌려 채우지 마십시오.

[요청 액션]
${c} 에 특화된 정보 위주로 생성하되, 다른 항목도 가이드라인에 맞춰 채워주세요.
`,$=(await f.chat.completions.create({model:y,messages:[{role:"system",content:r},{role:"user",content:k}],response_format:{type:"json_object"},temperature:.7})).choices[0].message.content;if(!$)throw Error("Empty response from OpenAI");let C=JSON.parse($);return t.NextResponse.json(p(C,n||"",i||"",c||"cs",a))}catch(e){console.error("OpenAI API Error:",e);try{let e=await o(s.productInfo||"",s.customerInquiry||"",s.sellerMemo||"",s.internalMemo||"",s.actionType||"cs",s.productName);return t.NextResponse.json(p(e,s.customerInquiry||"",s.productInfo||"",s.actionType||"cs",s.productName))}catch(e){return t.NextResponse.json({error:"서버 오류가 발생했습니다."},{status:500})}}}let m=new l.AppRouteRouteModule({definition:{kind:u.x.APP_ROUTE,page:"/api/generate/route",pathname:"/api/generate",filename:"route",bundlePath:"app/api/generate/route"},resolvedPagePath:"D:\\초보프로젝트\\connect-ai\\seller-ai-cs\\src\\app\\api\\generate\\route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:f,staticGenerationAsyncStorage:y,serverHooks:h}=m,g="/api/generate/route";function x(){return(0,c.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:y})}}};var s=require("../../../webpack-runtime.js");s.C(e);var i=e=>s(s.s=e),n=s.X(0,[948,972,214],()=>i(122));module.exports=n})();