"use client";

import { useState, ClipboardEvent } from "react";
import { Copy, AlertCircle, RefreshCcw, CheckCircle, Clock, Database, ChevronDown, ChevronRight, ImagePlus, X, Search, Trash2, Download, Upload, ArrowLeft } from "lucide-react";
import { AIResponse } from "@/lib/mockAi";
import { useHistory } from "@/hooks/useHistory";
import { useProductDB } from "@/hooks/useProductDB";

const safeRender = (data: any): React.ReactNode => {
  if (data === null || data === undefined || data === '') return "확인된 정보가 없습니다.";
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return (
      <ul className="list-disc pl-5 my-1">
        {data.map((item, idx) => (
          <li key={idx} className="mb-1">{safeRender(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof data === 'object') {
    return (
      <div className="flex flex-col gap-1 my-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <span className="font-semibold text-slate-800">{key}: </span>
            <span className="text-slate-700">{safeRender(value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return String(data);
};

const formatAnalysisToText = (data: any): string => {
  if (!data) return "";
  if (typeof data === 'string') return data;
  
  let result = "";
  if (typeof data === 'object') {
    const defaultKeys = [
      "상품명", "상품 종류", "소재", "사이즈", "색상", "구성품", "무게", 
      "사용 용도", "인증/KC/KF/시험성적서 여부", "주의사항", 
      "상세페이지에 없는 정보", "판매자가 확인해야 할 정보"
    ];
    
    const allKeys = Array.from(new Set([...defaultKeys, ...Object.keys(data)]));
    
    allKeys.forEach(key => {
      if (data[key] === undefined) return;
      
      const val = data[key];
      let valStr = "";
      
      if (val === null || val === undefined || val === "" || val === "null" || val === "없음" || val === "명시 안됨") {
        valStr = "확인되지 않음 (상세페이지 내 명시 없음)";
      } else if (Array.isArray(val)) {
        valStr = val.length > 0 ? val.join(", ") : "확인되지 않음";
      } else if (typeof val === 'object') {
        try { valStr = JSON.stringify(val); } catch(e) { valStr = String(val); }
      } else {
        valStr = String(val);
      }
      
      result += `- ${key}: ${valStr}\n`;
    });
  }
  return result.trim();
};

export default function Home() {
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productInfo, setProductInfo] = useState("");
  const [customerInquiry, setCustomerInquiry] = useState("");
  const [sellerMemo, setSellerMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [urlImageCandidates, setUrlImageCandidates] = useState<string[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [candidateAnalyzeStatus, setCandidateAnalyzeStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<'cs' | 'summary' | 'risk'>('cs');
  const [historyTab, setHistoryTab] = useState<'recent' | 'products'>('recent');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [detailedProductId, setDetailedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempInternalMemo, setTempInternalMemo] = useState("");
  const [result, setResult] = useState<AIResponse | null>(null);

  const { history, addHistory, clearHistory } = useHistory();
  const { products, saveProductAndInquiry, findProduct, clearProductDB, deleteProduct, updateInternalMemo, importProductDB } = useProductDB();

  const handleExportDB = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem('seller-ai-product-db') || "[]");
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "seller_ai_product_db.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (importProductDB(result)) {
        alert("상품 DB를 성공적으로 불러왔습니다.");
      } else {
        alert("올바르지 않은 JSON 파일입니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const handleProductBlur = () => {
    if (!productName && !productUrl) return;
    const found = findProduct(productName, productUrl);
    if (found) {
      if (!productInfo && found.info) setProductInfo(found.info);
      if (found.name && !productName) setProductName(found.name);
      if (found.url && !productUrl) setProductUrl(found.url);
    }
  };

  const handleAnalyzeUrl = async () => {
    if (!productUrl || !productUrl.trim()) {
      alert("상품 URL을 입력해주세요.");
      return;
    }
    
    // http 포함 여부는 API를 무조건 호출하기 위해 경고 띄우고 넘어가게 하거나 여기서 막을 수 있음
    // 일단 사용자가 URL이 있으면 반드시 API 호출되길 원했으나, fetch 형식상 http 필수이므로 유지
    if (!productUrl.startsWith('http')) {
      alert("유효한 상품 URL을 입력해주세요. (http:// 또는 https:// 포함)");
      return;
    }

    console.log("[URL 분석 시작]", productUrl);
    setIsAnalyzingUrl(true);
    
    try {
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '자동 분석 실패: 상품정보를 직접 붙여넣어 주세요');
      }

      console.log("[URL 분석 성공]", data);

      const formattedText = formatAnalysisToText(data.infoText);

      setProductInfo(formattedText);
      setActiveTab('summary');
      setResult(prev => prev ? { ...prev, summary: formattedText } : { csReply: '', summary: formattedText, risks: '', sellerNotes: '' });
      
      if (data.imageCandidates && data.imageCandidates.length > 0) {
        setUrlImageCandidates(data.imageCandidates);
        setSelectedCandidates([]);
      } else {
        setUrlImageCandidates([]);
      }
      
    } catch (error: any) {
      console.error("[URL 분석 실패]", error);
      alert(error.message || "자동 분석 실패: 상품정보를 직접 붙여넣어 주세요");
      // 실패 시에도 버튼 회색 멈춤 방지를 위해 확실히 초기화 (finally에서도 처리됨)
    } finally {
      setIsAnalyzingUrl(false);
    }
  };

  const handlePaste = async (e: ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) return;
    e.preventDefault();

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1024;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImages(prev => [...prev, compressedDataUrl]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeImages = async () => {
    if (images.length === 0) return;

    setIsAnalyzingImage(true);
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이미지 분석 실패: 다시 붙여넣거나 상품정보를 직접 입력해 주세요');
      }

      const formattedText = formatAnalysisToText(data.infoText);

      const appendedInfo = productInfo 
        ? `${productInfo}\n\n[상세페이지 이미지 분석 결과]\n${formattedText}` 
        : `[상세페이지 이미지 분석 결과]\n${formattedText}`;

      setProductInfo(appendedInfo);
      setActiveTab('summary');
      
      setResult(prev => prev 
        ? { ...prev, summary: prev.summary ? `${prev.summary}\n\n[이미지 분석 추가 정보]\n${formattedText}` : formattedText } 
        : { csReply: '', summary: formattedText, risks: '', sellerNotes: '' }
      );
      
      // 메모리 최적화: 분석 완료 후 큰 용량의 base64 이미지 데이터 삭제
      setImages([]);
      
    } catch (error: any) {
      alert(error.message || "이미지 분석 실패: 다시 붙여넣거나 상품정보를 직접 입력해 주세요");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleAnalyzeCandidates = async (urlsToAnalyze: string[]) => {
    if (urlsToAnalyze.length === 0) return;
    setCandidateAnalyzeStatus(true);
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: urlsToAnalyze })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이미지 분석 실패: 다시 시도해주세요.');
      }

      const formattedText = formatAnalysisToText(data.infoText);

      const appendedInfo = productInfo 
        ? `${productInfo}\n\n[선택 이미지 분석 결과]\n${formattedText}` 
        : `[선택 이미지 분석 결과]\n${formattedText}`;

      setProductInfo(appendedInfo);
      setActiveTab('summary');
      
      setResult(prev => prev 
        ? { ...prev, summary: prev.summary ? `${prev.summary}\n\n[이미지 분석 추가 정보]\n${formattedText}` : formattedText } 
        : { csReply: '', summary: formattedText, risks: '', sellerNotes: '' }
      );
      
    } catch (error: any) {
      alert(error.message || "이미지 분석 실패");
    } finally {
      setCandidateAnalyzeStatus(false);
    }
  };

  const handleAction = async (actionType: 'cs' | 'summary' | 'risk') => {
    if (!productInfo.trim()) {
      alert("상품 정보를 입력해주세요.");
      return;
    }
    
    setLoading(true);
    setActiveTab(actionType);
    
    let internalMemo = "";
    if (productName || productUrl) {
      const found = findProduct(productName, productUrl);
      if (found && found.internalMemo) {
        internalMemo = found.internalMemo;
      }
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productInfo, customerInquiry, sellerMemo, internalMemo, actionType })
      });
      
      if (!response.ok) {
        throw new Error('API response was not ok');
      }
      
      const res: AIResponse = await response.json();
      
      const newResult = result ? { ...result, ...res } : res;
      setResult(newResult);
      
      if (actionType === 'cs') {
        addHistory({
          productInfo,
          customerInquiry,
          sellerMemo,
          result: newResult,
        });
        
        if (productName || productUrl) {
          saveProductAndInquiry(
            productName,
            productUrl,
            productInfo,
            customerInquiry,
            sellerMemo,
            newResult.csReply
          );
        }
      }
    } catch (error) {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.csReply) {
      navigator.clipboard.writeText(result.csReply);
      alert("클립보드에 복사되었습니다.");
    }
  };

  const handleReset = () => {
    setProductName("");
    setProductUrl("");
    setProductInfo("");
    setCustomerInquiry("");
    setSellerMemo("");
    setImages([]);
    setUrlImageCandidates([]);
    setSelectedCandidates([]);
    setResult(null);
    setIsAnalyzingUrl(false);
    setIsAnalyzingImage(false);
    setCandidateAnalyzeStatus(false);
    setLoading(false);
  };

  const loadProductToInputs = (p: any) => {
    setProductName(p.name);
    setProductUrl(p.url);
    setProductInfo(p.info);
    if (p.internalMemo) {
      setSellerMemo((prev) => prev ? prev + "\n\n" + p.internalMemo : p.internalMemo);
    }
    setImages([]);
  };

  const handleReuseInquiry = (inquiry: string) => {
    if (customerInquiry && customerInquiry.trim() !== '') {
      if (!confirm("현재 입력된 문의 내용이 있습니다. 덮어쓰시겠습니까?")) return;
    }
    setCustomerInquiry(inquiry);
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.url && p.url.toLowerCase().includes(q)) ||
      (p.info && p.info.toLowerCase().includes(q)) ||
      p.inquiries.some(inq => inq.customerInquiry.toLowerCase().includes(q) || (typeof inq.csReply === 'string' && inq.csReply.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <CheckCircle size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">셀러 AI 직원</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">온라인 셀러 전용 CS 및 리스크 관리</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 text-slate-800">정보 입력</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      상품명/관리명
                    </label>
                    <input 
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      onBlur={handleProductBlur}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none"
                      placeholder="예: 쿨 마스크"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      상품 URL
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={productUrl}
                        onChange={(e) => setProductUrl(e.target.value)}
                        onBlur={handleProductBlur}
                        className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none"
                        placeholder="https://..."
                      />
                      <button
                        onClick={handleAnalyzeUrl}
                        disabled={isAnalyzingUrl || !productUrl}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
                      >
                        {isAnalyzingUrl ? '분석 중...' : 'URL 분석'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 이미지 후보 UI */}
                {urlImageCandidates.length > 0 ? (
                  <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-slate-700">
                        발견된 이미지 후보 ({urlImageCandidates.length}개)
                      </label>
                      <button 
                        onClick={() => handleAnalyzeCandidates(selectedCandidates)}
                        disabled={selectedCandidates.length === 0 || candidateAnalyzeStatus}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
                      >
                        {candidateAnalyzeStatus ? '분석 중...' : '선택 이미지 분석'}
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                      {urlImageCandidates.map((src, idx) => (
                        <div 
                          key={idx} 
                          className={`relative shrink-0 cursor-pointer border-2 rounded-md transition-colors ${selectedCandidates.includes(src) ? 'border-indigo-600' : 'border-transparent'}`}
                          onClick={() => {
                            setSelectedCandidates(prev => 
                              prev.includes(src) ? prev.filter(item => item !== src) : [...prev, src]
                            );
                          }}
                        >
                          <img src={src} alt={`candidate-${idx}`} className="w-20 h-20 object-cover rounded-md bg-white" />
                          <div className={`absolute top-1 right-1 w-4 h-4 rounded-full border flex items-center justify-center ${selectedCandidates.includes(src) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                            {selectedCandidates.includes(src) && <CheckCircle size={10} className="text-white" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  isAnalyzingUrl === false && productUrl && productInfo && (
                    <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500 text-center">
                      이미지 후보를 찾지 못했습니다. 직접 이미지를 붙여넣어 주세요.
                    </div>
                  )
                )}

                {/* 이미지 붙여넣기 영역 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    상세페이지 이미지 (Ctrl+V) <span className="text-xs text-slate-400 font-normal ml-2">여러 장 가능</span>
                  </label>
                  <div 
                    onPaste={handlePaste}
                    className="w-full min-h-24 p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center transition-all focus-within:border-indigo-500 focus-within:bg-indigo-50 outline-none"
                    tabIndex={0}
                  >
                    {images.length === 0 ? (
                      <div className="text-center text-slate-400">
                        <ImagePlus size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">여기를 클릭하고 이미지를 붙여넣으세요 (Ctrl+V)</p>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="flex flex-wrap gap-3 mb-3">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img src={img} alt="pasted" className="w-16 h-16 object-cover rounded-md border border-slate-200" />
                              <button 
                                onClick={() => removeImage(idx)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleAnalyzeImages}
                          disabled={isAnalyzingImage}
                          className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          {isAnalyzingImage ? '이미지 분석 중...' : <><Search size={16} /> 붙여넣은 이미지 분석하여 정보에 추가</>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    상품 정보 (필수)
                  </label>
                  <textarea 
                    value={productInfo}
                    onChange={(e) => setProductInfo(e.target.value)}
                    className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none"
                    placeholder="상품의 스펙, 재질, 사이즈 등을 입력하거나 자동 분석 결과를 확인하세요."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    고객 문의
                  </label>
                  <textarea 
                    value={customerInquiry}
                    onChange={(e) => setCustomerInquiry(e.target.value)}
                    className="w-full h-24 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none"
                    placeholder="고객이 질문한 내용을 그대로 붙여넣으세요."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    판매자 메모 (선택)
                  </label>
                  <textarea 
                    value={sellerMemo}
                    onChange={(e) => setSellerMemo(e.target.value)}
                    className="w-full h-16 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none"
                    placeholder="예: 배송 지연 예상됨, 재고 부족"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button 
                  onClick={() => handleAction('cs')}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading && activeTab === 'cs' ? '생성 중...' : 'CS 답변 생성'}
                </button>
                <button 
                  onClick={() => handleAction('summary')}
                  disabled={loading}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition-colors border border-slate-300 disabled:opacity-50"
                >
                  상품 분석
                </button>
                <button 
                  onClick={() => handleAction('risk')}
                  disabled={loading}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium py-2.5 px-4 rounded-lg transition-colors border border-rose-200 disabled:opacity-50"
                >
                  위험문구 체크
                </button>
              </div>
              <div className="mt-4 text-center">
                <button 
                  onClick={handleReset}
                  className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors inline-flex items-center gap-1"
                >
                  <RefreshCcw size={14} /> 모두 초기화
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Output & History */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Output Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
              <div className="flex border-b border-slate-200 bg-slate-50">
                <button 
                  onClick={() => setActiveTab('cs')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'cs' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                  고객 발송용 CS 답변
                </button>
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                  상품 요약
                </button>
                <button 
                  onClick={() => setActiveTab('risk')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'risk' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                  위험문구 및 주의
                </button>
              </div>
              
              <div className="p-6 flex-1 min-h-[300px] bg-white relative">
                {!result ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <CheckCircle size={48} className="mb-4 opacity-20" />
                    <p>정보를 입력하고 버튼을 눌러 결과를 확인하세요.</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    {activeTab === 'cs' && (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-semibold text-slate-800">고객 발송용 답변</h3>
                          <button 
                            onClick={handleCopy}
                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <Copy size={16} /> 복사하기
                          </button>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed flex-1">
                          {result.csReply ? safeRender(result.csReply) : "생성된 답변이 없습니다."}
                        </div>
                        {result.sellerNotes && (
                          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-sm">
                            <AlertCircle className="shrink-0 mt-0.5" size={16} />
                            <div>
                              <strong className="block mb-1">판매자 확인용 메모</strong>
                              <div className="whitespace-pre-wrap leading-relaxed">{safeRender(result.sellerNotes)}</div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {activeTab === 'summary' && (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed flex-1">
                        {result.summary ? safeRender(result.summary) : "상품 요약이 아직 생성되지 않았습니다."}
                      </div>
                    )}

                    {activeTab === 'risk' && (
                      <div className="bg-rose-50 p-4 rounded-lg border border-rose-200 text-rose-800 whitespace-pre-wrap leading-relaxed flex-1">
                        {result.risks ? safeRender(result.risks) : "위험문구 분석 결과가 없습니다."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* History / Product DB Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50">
                <button 
                  onClick={() => setHistoryTab('recent')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2 ${historyTab === 'recent' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                  <Clock size={16} /> 최근 문의 기록
                </button>
                <button 
                  onClick={() => setHistoryTab('products')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2 ${historyTab === 'products' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                  <Database size={16} /> 저장된 상품 DB
                </button>
              </div>

              <div className="p-6">
                {historyTab === 'recent' && (
                  <div>
                    <div className="flex justify-end mb-3">
                      {history.length > 0 && (
                        <button onClick={clearHistory} className="text-xs text-slate-500 hover:text-rose-600 transition-colors">
                          기록 모두 삭제
                        </button>
                      )}
                    </div>
                    {history.length === 0 ? (
                      <div className="text-center py-6 text-sm text-slate-400">저장된 최근 기록이 없습니다.</div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {history.map((item) => (
                          <div key={item.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
                            setProductInfo(item.productInfo);
                            setCustomerInquiry(item.customerInquiry);
                            setSellerMemo(item.sellerMemo);
                            setResult(item.result);
                            setActiveTab('cs');
                          }}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-indigo-600 truncate mr-2">{item.customerInquiry || "상품 분석"}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{item.date}</span>
                            </div>
                            <div className="text-xs text-slate-500 truncate">{typeof item.result.csReply === 'string' ? item.result.csReply.substring(0, 50) : "답변 내용 보기"}...</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {historyTab === 'products' && (
                  <div>
                    {detailedProductId ? (
                      <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                        {(() => {
                          const p = products.find(prod => prod.productId === detailedProductId);
                          if (!p) return <div className="p-4 text-center text-slate-500">상품 정보를 찾을 수 없습니다.</div>;
                          return (
                            <>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                <button onClick={() => setDetailedProductId(null)} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                                  <ArrowLeft size={18} className="mr-1" /> 목록으로
                                </button>
                                <button onClick={() => { loadProductToInputs(p); alert("입력칸으로 불러왔습니다."); }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
                                  이 상품 불러오기
                                </button>
                              </div>
                              <div className="overflow-y-auto pr-2" style={{ maxHeight: '600px' }}>
                                <div className="mb-4">
                                  <h3 className="text-xl font-bold text-slate-800">{p.name}</h3>
                                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-500 hover:underline">{p.url}</a>}
                                </div>
                                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-wrap text-sm text-slate-700">
                                  <div className="font-semibold text-slate-800 mb-2 border-b border-slate-200 pb-2">분석된 상품 정보</div>
                                  {safeRender(p.info)}
                                </div>
                                <div className="mb-6">
                                  <div className="font-semibold text-slate-800 mb-2 flex justify-between items-center">
                                    상품별 내부 메모
                                    {tempInternalMemo !== (p.internalMemo || "") && (
                                      <button onClick={() => { updateInternalMemo(p.productId, tempInternalMemo); alert("저장되었습니다."); }} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 font-medium">저장</button>
                                    )}
                                  </div>
                                  <textarea 
                                    className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    rows={4}
                                    placeholder="상품별 주의사항, 공급처 정보 등 내부용 메모를 작성하세요 (고객 답변에 미노출)"
                                    value={tempInternalMemo}
                                    onChange={(e) => setTempInternalMemo(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-800 mb-3">과거 고객 문의 내역 ({p.inquiries.length}건)</div>
                                  {p.inquiries.length === 0 ? <p className="text-sm text-slate-500">문의 내역이 없습니다.</p> : (
                                    <div className="space-y-4">
                                      {p.inquiries.map(inq => (
                                        <div key={inq.id} className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                                          <div className="flex justify-between items-start mb-2">
                                            <div className="text-xs text-slate-400">{inq.date}</div>
                                            <button onClick={() => handleReuseInquiry(inq.customerInquiry)} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1">
                                              <RefreshCcw size={12} /> 이 문의 다시 사용
                                            </button>
                                          </div>
                                          <div className="mb-3">
                                            <span className="font-semibold text-rose-600 mr-2">Q.</span>
                                            <span className="text-slate-700 text-sm">{inq.customerInquiry}</span>
                                          </div>
                                          <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 whitespace-pre-wrap">
                                            <span className="font-semibold text-indigo-600 mr-2 block mb-1">A.</span>
                                            {safeRender(inq.csReply)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="animate-in fade-in duration-200">
                        <div className="flex flex-col gap-3 mb-4">
                          <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                              <label className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md hover:bg-slate-200 cursor-pointer flex items-center gap-1 transition-colors">
                                <Upload size={14} /> DB 가져오기
                                <input type="file" accept=".json" className="hidden" onChange={handleImportDB} />
                              </label>
                              <button onClick={handleExportDB} className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md hover:bg-slate-200 cursor-pointer flex items-center gap-1 transition-colors">
                                <Download size={14} /> DB 내보내기
                              </button>
                            </div>
                            {products.length > 0 && (
                              <button onClick={clearProductDB} className="text-xs text-slate-500 hover:text-rose-600 transition-colors">
                                DB 모두 초기화
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="text" 
                              placeholder="상품명, URL, 문의 내용 등 검색..." 
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>
                        {filteredProducts.length === 0 ? (
                          <div className="text-center py-6 text-sm text-slate-400">
                            {products.length === 0 ? "저장된 상품 DB가 없습니다." : "검색 결과가 없습니다."}
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {filteredProducts.map((p) => (
                              <div key={p.productId} className="border border-slate-200 rounded-lg bg-white hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col" onClick={() => { setDetailedProductId(p.productId); setTempInternalMemo(p.internalMemo || ""); }}>
                                <div className="p-4 flex items-center justify-between">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <div className="text-sm font-bold text-slate-800 truncate mb-1">{p.name}</div>
                                    <div className="flex gap-3 text-xs text-slate-500 truncate">
                                      {p.url && <span className="truncate max-w-[200px] text-indigo-500">{p.url}</span>}
                                      <span>문의 {p.inquiries.length}건</span>
                                      {p.internalMemo && <span className="text-amber-600 bg-amber-50 px-1.5 rounded">메모 있음</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`'${p.name}' 상품을 정말 삭제하시겠습니까?`)) { deleteProduct(p.productId); } }} className="text-slate-300 hover:text-rose-600 p-2 rounded-full hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
                                      <Trash2 size={16} />
                                    </button>
                                    <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
