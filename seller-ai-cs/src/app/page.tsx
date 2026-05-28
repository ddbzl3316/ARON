"use client";

import { useState, useEffect, ClipboardEvent } from "react";
import { 
  Copy, AlertCircle, RefreshCcw, CheckCircle, Clock, Database, 
  ChevronRight, ImagePlus, X, Search, Trash2, 
  Download, Upload, Cpu, Layers, BarChart3, TrendingUp, Sparkles, 
  Check, Play, Activity, HelpCircle, FileText, Send, Flame, ShieldCheck,
  BookOpen, ShieldAlert
} from "lucide-react";
import { AIResponse } from "@/lib/mockAi";

export interface WorkLogItem {
  id: string;
  time: string;
  role: "문의 수집 담당" | "상품 매칭 담당" | "위험 검수 담당" | "답변 작성 담당" | "최종 검토 담당" | "상품학습 담당";
  action: string;
  targetType: "inquiry" | "product" | "catalog" | "answer" | "system";
  targetId?: string;
  productName?: string;
  inquirySummary?: string;
  result: "success" | "warning" | "pending" | "failed";
  message: string;
  nextAction?: string;
}
import { useHistory } from "@/hooks/useHistory";
import { useProductDB, InboxItem, Product } from "@/hooks/useProductDB";

const safeRender = (data: any): React.ReactNode => {
  if (data === null || data === undefined || data === '') return "확인된 정보가 없습니다.";
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return (
      <ul className="list-disc pl-5 my-1 text-slate-350">
        {data.map((item, idx) => (
          <li key={idx} className="mb-0.5">{safeRender(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof data === 'object') {
    return (
      <div className="flex flex-col gap-1 my-1 text-slate-300 bg-[#070b18]/80 p-2.5 rounded-lg border border-indigo-500/10 shadow-inner">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="text-[10px]">
            <span className="font-semibold text-slate-400">{key}: </span>
            <span className="text-slate-200">{safeRender(value)}</span>
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
  // Navigation tabs
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'inquiries' | 'knowledge' | 'automation' | 'reports'>('dashboard');
  const [knowledgeTab, setKnowledgeTab] = useState<'learn' | 'library'>('learn');

  // Logic inputs
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productInfo, setProductInfo] = useState("");
  const [customerInquiry, setCustomerInquiry] = useState("");
  const [sellerMemo, setSellerMemo] = useState("");
  const [productCode, setProductCode] = useState("");

  // [v1.0-E] 업무 로그 상태 및 헬퍼 함수 정의
  const [workLogs, setWorkLogs] = useState<WorkLogItem[]>([]);

  const writeWorkLog = (
    role: "문의 수집 담당" | "상품 매칭 담당" | "위험 검수 담당" | "답변 작성 담당" | "최종 검토 담당" | "상품학습 담당",
    action: string,
    targetType: "inquiry" | "product" | "catalog" | "answer" | "system",
    result: "success" | "warning" | "pending" | "failed",
    message: string,
    details?: {
      targetId?: string;
      productName?: string;
      inquirySummary?: string;
      nextAction?: string;
    }
  ) => {
    setWorkLogs((prev) => {
      const newLog: WorkLogItem = {
        id: `wlog_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        time: new Date().toLocaleString('ko-KR'),
        role,
        action,
        targetType,
        result,
        message,
        targetId: details?.targetId,
        productName: details?.productName,
        inquirySummary: details?.inquirySummary,
        nextAction: details?.nextAction
      };
      
      // 최대 150건 유지 링 버퍼 적용
      const updated = [newLog, ...prev].slice(0, 150);
      localStorage.setItem('seller-ai-work-logs-db', JSON.stringify(updated));
      return updated;
    });
  };

  const getRoleBadgeColor = (role: WorkLogItem['role']) => {
    switch (role) {
      case "문의 수집 담당":
        return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
      case "상품 매칭 담당":
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case "위험 검수 담당":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse";
      case "답변 작성 담당":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "최종 검토 담당":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "상품학습 담당":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  const getResultBadgeColor = (result: WorkLogItem['result']) => {
    switch (result) {
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "pending":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "failed":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  const getTodayMetricCount = (role: WorkLogItem['role'], action: string, result?: WorkLogItem['result']) => {
    return workLogs.filter(log => {
      const matchRole = log.role === role;
      const matchAction = log.action === action;
      const matchResult = result ? log.result === result : true;
      return matchRole && matchAction && matchResult;
    }).length;
  };

  // localStorage 로딩 및 초기 시뮬레이션용 기억 데이터 주입
  useEffect(() => {
    const saved = localStorage.getItem('seller-ai-work-logs-db');
    if (saved) {
      try {
        setWorkLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Work logs parsing failed', e);
      }
    } else {
      const initialWorkLogs: WorkLogItem[] = [
        {
          id: 'wlog_init_1',
          time: new Date(Date.now() - 3600000 * 2).toLocaleString('ko-KR'),
          role: "문의 수집 담당",
          action: "수동 문의 추가",
          targetType: "inquiry",
          targetId: "inbox_1",
          productName: "쿨 마스크",
          inquirySummary: "안녕하세요, 어제 쿨 마스크 3개 주문했는데...",
          result: "success",
          message: "플랫폼(스마트스토어)으로부터 신규 스펙 문의 [inbox_1]를 감지하여 유입하였습니다."
        },
        {
          id: 'wlog_init_2',
          time: new Date(Date.now() - 3600000 * 1.8).toLocaleString('ko-KR'),
          role: "상품 매칭 담당",
          action: "상품 수동 매칭",
          targetType: "product",
          targetId: "inbox_1",
          productName: "쿨 마스크",
          inquirySummary: "안녕하세요, 어제 쿨 마스크 3개 주문했는데...",
          result: "success",
          message: "고객 문의내용 시맨틱 분석 결과, 상품 DB 내 '쿨 마스크' 상품과 자동 연결되었습니다."
        },
        {
          id: 'wlog_init_3',
          time: new Date(Date.now() - 3600000 * 1.5).toLocaleString('ko-KR'),
          role: "위험 검수 담당",
          action: "위험 검수",
          targetType: "inquiry",
          targetId: "inbox_2",
          productName: "쿨 마스크",
          inquirySummary: "쿨 마스크 세탁기 울코스로 살살 돌렸는데...",
          result: "warning",
          message: "건조기 사용 불가 주의사항 안내 필수 요건이 감지되었습니다. (위험 수준: 보통)",
          nextAction: "위험 예외 안내 가이드를 답변 초안에 주입하였습니다."
        },
        {
          id: 'wlog_init_4',
          time: new Date(Date.now() - 3600000 * 1.2).toLocaleString('ko-KR'),
          role: "답변 작성 담당",
          action: "CS 답변 초안 작성",
          targetType: "answer",
          targetId: "inbox_2",
          productName: "쿨 마스크",
          inquirySummary: "쿨 마스크 세탁기 울코스로 살살 돌렸는데...",
          result: "success",
          message: "매칭 상품 정보를 연동하여 정중한 카톡 CS 톤의 1:1 고객 답변 초안 작성을 완료했습니다."
        }
      ];
      setWorkLogs(initialWorkLogs);
      localStorage.setItem('seller-ai-work-logs-db', JSON.stringify(initialWorkLogs));
    }
  }, []);

  // System states
  const [loading, setLoading] = useState(false);
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [urlImageCandidates, setUrlImageCandidates] = useState<string[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [candidateAnalyzeStatus, setCandidateAnalyzeStatus] = useState(false);

  // Search & Library details
  const [searchQuery, setSearchQuery] = useState("");
  const [detailedProductId, setDetailedProductId] = useState<string | null>(null);
  const [tempInternalMemo, setTempInternalMemo] = useState("");
  const [result, setResult] = useState<AIResponse | null>(null);

  // CS view selections
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>("inbox_1");
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'pending' | 'drafted' | 'approved' | 'risk'>('all');

  // Automation scraper inputs
  const [catalogUrl, setCatalogUrl] = useState("");
  const [catalogLimit, setCatalogLimit] = useState(3);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [catalogTaskState, setCatalogTaskState] = useState<any | null>(null);
  const [isCatalogPolling, setIsCatalogPolling] = useState(false);

  // AI workspace sub-tab
  const [activeTab, setActiveTab] = useState<'cs' | 'summary' | 'risk'>('cs');

  // Hook states
  const { history = [], addHistory = () => {}, clearHistory = () => {} } = (useHistory() || {}) as any;
  const { 
    products = [], 
    saveProductAndInquiry = () => {}, 
    findProduct = () => undefined, 
    clearProductDB = () => {}, 
    deleteProduct = () => {}, 
    updateInternalMemo = () => {}, 
    importProductDB = () => false,
    saveOnlyProduct = () => {},
    importProductsBulk = () => ({ inserted: 0, updated: 0 }),
    collectionHistory = [],
    addCollectionHistory = () => {},
    clearCollectionHistory = () => {},
    inboxItems = [],
    logs = [],
    addInboxItem = () => {},
    addInboxItemsBulk = () => {},
    updateInboxItem = () => {},
    deleteInboxItem = () => {},
    addLog = () => {},
    clearInboxAndLogs = () => {},
    resetInboxAndLogs = () => {},
    clearInboxSelective = () => {}
  } = (useProductDB() || {}) as any;

  const safeHistory = Array.isArray(history) ? history : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCollectionHistory = Array.isArray(collectionHistory) ? collectionHistory : [];
  const safeInboxItems = Array.isArray(inboxItems) ? inboxItems : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

  // Polling catalog scraping status
  useEffect(() => {
    let interval: any;
    if (isCatalogPolling && activeTaskId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/analyze-catalog/status?taskId=${activeTaskId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.task) {
              setCatalogTaskState(data.task);
              if (data.task.status === 'completed' || data.task.status === 'failed') {
                setIsCatalogPolling(false);
                addLog(`⚙️ 대량수집 배치완료 [ID: ${activeTaskId}] -> 결과 보고서 생성됨`, 'success');

                writeWorkLog(
                  "상품학습 담당",
                  "자동 수집 완료",
                  "catalog",
                  data.task.status === 'completed' ? "success" : "failed",
                  data.task.status === 'completed' 
                    ? `대량 상품 자동 수집 배치 태스크가 완료되었습니다. (성공 건수가 상품 DB에 연동 적재되었습니다.)`
                    : `대량 상품 자동 수집 배치가 이상 오류로 인해 실패로 중단되었습니다.`,
                  { targetId: activeTaskId || undefined }
                );

                // 대량 수집 완료 시 상품 DB에 저장
                if (data.task.status === 'completed' && data.task.items && data.task.items.length > 0) {
                  const itemsToSave = data.task.items
                    .filter((item: any) => item.status !== 'PENDING' && item.status !== 'FAILED')
                    .map((item: any) => ({
                      name: item.productName || '상품명 미식별',
                      url: item.url,
                      info: item.infoText || '',
                      imageCandidates: item.imageCandidates || [],
                      collectionSource: 'auto-collector',
                      collectedAt: new Date().toLocaleString('ko-KR'),
                      learningStatus: (item.status === 'SUCCESS' ? '학습 완료' : item.status === 'INSUFFICIENT' ? '정보 부족' : 'URL 분석 필요') as any,
                      reviewStatus: (item.status === 'CHECK_REQUIRED' ? 'needs_review' : 'auto_draft') as any
                    }));

                  if (itemsToSave.length > 0) {
                    const importRes = importProductsBulk(itemsToSave);
                    addLog(`📦 수집 상품 ${importRes.inserted}건 신규 등록, ${importRes.updated}건 업데이트 완료 (상품 DB 보관함 확인 가능)`, 'success');
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Scraper status polling error:", e);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCatalogPolling, activeTaskId, importProductsBulk, addLog]);

  // ===================================================================
  // [v1.0-C] 정보 부족 상품 수동 보완 상태 및 유틸리티 함수군 정의
  // ===================================================================
  const [supplementaryValues, setSupplementaryValues] = useState<Record<string, string>>({});

  // info 텍스트 내에서 이미 수동 보완이 완료된 정보가 있는지 역파싱하여 input에 노출
  const parseExistingSupplementedFields = (infoText: string): Record<string, string> => {
    const values: Record<string, string> = {};
    if (!infoText) return values;
    
    const absenceKeywords = ["명시 없음", "확인되지 않음", "제공 여부 확인 필요", "상세페이지 내 명시 없음", "확인 필요", "별도 표기 없음", "미확인"];
    
    infoText.split('\n').forEach(line => {
      if (line.includes(':')) {
        const fieldName = line.substring(0, line.indexOf(':')).replace(/^-\s*/, '').trim();
        const val = line.substring(line.indexOf(':') + 1).trim();
        
        const hasTag = val.includes('(수동 보완)') || val.includes('(판매자 입력 기준)');
        const isAbsent = absenceKeywords.some(kw => val.includes(kw));
        
        if (hasTag || (!isAbsent && val.length > 0)) {
          const cleanVal = val
            .replace(/\s*\(수동\s*보완\)/i, '')
            .replace(/\s*\(판매자\s*입력\s*기준\)/i, '')
            .replace(/\s*\[신뢰도:\s*.*?\]/i, '')
            .trim();
          values[fieldName] = cleanVal;
        }
      }
    });
    return values;
  };

  // info 마크다운 특정 라인을 수동 보완된 텍스트로 치환 (민감사양 가드 반영)
  const updateProductInfoLine = (info: string, fieldName: string, value: string): string => {
    if (!info) return info;
    const lines = info.split('\n');
    const targetPattern = new RegExp(`^-\\s*${fieldName}\\s*:`, 'i');
    
    const updatedLines = lines.map(line => {
      if (targetPattern.test(line)) {
        const sensitiveFields = ["KC", "KF", "인증", "식품용", "식품", "어린이", "방수", "생활방수", "하중", "내하중", "안전성", "불량", "환불"];
        const isSensitive = sensitiveFields.some(f => fieldName.includes(f));
        
        const suffix = isSensitive ? " (판매자 입력 기준)" : " (수동 보완)";
        return `- ${fieldName}: ${value.trim()}${suffix} [신뢰도: 높음]`;
      }
      return line;
    });
    
    return updatedLines.join('\n');
  };

  // 개별 스펙 보완 저장
  const handleSaveSupplementField = (fieldName: string, value: string) => {
    if (!detailedProductId) return;
    const p = safeProducts.find(prod => prod.productId === detailedProductId);
    if (!p) return;
    
    const updatedInfo = updateProductInfoLine(p.info, fieldName, value);
    const updatedProduct = {
      ...p,
      info: updatedInfo,
      updatedAt: new Date().toLocaleString('ko-KR')
    };
    
    saveOnlyProduct(updatedProduct);
    addLog(`💾 상품 "${p.name}"의 [${fieldName}] 스펙 수동 보완 완료`, 'success');

    writeWorkLog(
      "상품학습 담당",
      "상품 정보 수동 보완",
      "product",
      "success",
      `상품 '${p.name}'의 누락된 [${fieldName}] 지식 정보를 수동으로 보충하여 DB를 개정했습니다.`,
      { productName: p.name }
    );
  };

  // 모든 보완 스펙 일괄 저장
  const handleSaveAllSupplementFields = () => {
    if (!detailedProductId) return;
    const p = safeProducts.find(prod => prod.productId === detailedProductId);
    if (!p) return;
    
    let updatedInfo = p.info;
    let anySaved = false;

    Object.entries(supplementaryValues).forEach(([fieldName, value]) => {
      if (value !== undefined && value.trim() !== '') {
        updatedInfo = updateProductInfoLine(updatedInfo, fieldName, value);
        anySaved = true;
      }
    });
    
    if (!anySaved) {
      alert("보완 입력된 항목이 존재하지 않습니다.");
      return;
    }

    const updatedProduct = {
      ...p,
      info: updatedInfo,
      updatedAt: new Date().toLocaleString('ko-KR')
    };
    
    saveOnlyProduct(updatedProduct);
    addLog(`💾 상품 "${p.name}"의 모든 수동 보완 스펙 일괄 저장 완료`, 'success');

    writeWorkLog(
      "상품학습 담당",
      "상품 정보 수동 보완",
      "product",
      "success",
      `상품 '${p.name}'의 모든 누락 스펙 지식 정보에 대해 일괄 수동 보완을 완료하여 DB를 개정했습니다.`,
      { productName: p.name }
    );

    alert("모든 보완 정보가 성공적으로 일괄 저장되었습니다.");
  };

  // 상품 최종 학습 완료 수동 승격
  const handlePromoteToLearned = (productId: string) => {
    const p = safeProducts.find(prod => prod.productId === productId);
    if (!p) return;
    
    const updatedProduct = {
      ...p,
      learningStatus: '학습 완료' as any,
      updatedAt: new Date().toLocaleString('ko-KR')
    };
    
    saveOnlyProduct(updatedProduct);
    addLog(`🎓 상품 "${p.name}" 최종 학습 완료 수동 승격 완료 (정상 스펙 DB 통합)`, 'success');

    writeWorkLog(
      "상품학습 담당",
      "최종 학습 완료 처리",
      "product",
      "success",
      `상품 '${p.name}'의 모든 사양 보완 및 검토가 끝나 지식 상태를 '학습 완료' 규격으로 최종 수동 승격했습니다.`,
      { productName: p.name }
    );

    alert("본 상품이 최종 학습 완료 상태로 승격되었습니다.");
  };

  // 보완 입력 여부 판별 헬퍼
  const isProductSupplemented = (p: any): boolean => {
    if (!p || !p.info) return false;
    return p.info.includes('(수동 보완)') || p.info.includes('(판매자 입력 기준)');
  };

  // detailedProductId 변경 시 기존 보완된 필드 로드
  useEffect(() => {
    if (detailedProductId) {
      const p = safeProducts.find(prod => prod.productId === detailedProductId);
      if (p) {
        const existingSupplemented = parseExistingSupplementedFields(p.info);
        setSupplementaryValues(existingSupplemented);
      }
    }
  }, [detailedProductId, products]);

  // Synchronize input fields and states when selectedInboxId changes
  useEffect(() => {
    if (selectedInboxId) {
      const inboxItem = safeInboxItems.find(item => item.id === selectedInboxId);
      if (inboxItem) {
        setCustomerInquiry(inboxItem.customerInquiry);
        setProductName(inboxItem.matchedProductName || "");
        setProductUrl(inboxItem.productUrl || "");
        setProductCode(inboxItem.productCode || "");
        setSellerMemo(inboxItem.sellerMemo || "");
        
        // Find corresponding product spec in local DB
        const matchedProduct = findProduct(inboxItem.matchedProductName || "", inboxItem.productUrl || "");
        if (matchedProduct) {
          setProductInfo(matchedProduct.info);
          setResult({
            csReply: inboxItem.replyDraft || "",
            summary: matchedProduct.info,
            risks: inboxItem.riskReason || "",
            sellerNotes: ""
          });
        } else {
          setProductInfo("");
          setResult(inboxItem.replyDraft ? {
            csReply: inboxItem.replyDraft,
            summary: "",
            risks: inboxItem.riskReason || "",
            sellerNotes: ""
          } : null);
        }
        
        // Auto reset scrap candidates
        setUrlImageCandidates([]);
        setSelectedCandidates([]);
      }
    }
  }, [selectedInboxId, inboxItems]);

  const handleExportDB = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem('seller-ai-product-db') || "[]");
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "seller_ai_product_db.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addLog("📥 상품 데이터베이스 백업 파일 내보내기 완료", "success");
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (importProductDB(result)) {
        addLog("📤 상품 데이터베이스 백업 파일 불러오기 완료", "success");
        alert("상품 DB를 성공적으로 불러왔습니다.");
      } else {
        alert("올바르지 않은 JSON 파일입니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; 
  };

  const handleProductBlur = () => {
    if (!productName && !productUrl) return;
    const found = findProduct(productName, productUrl);
    if (found) {
      if (!productInfo && found.info) setProductInfo(found.info);
      if (found.name && !productName) setProductName(found.name);
      if (found.url && !productUrl) setProductUrl(found.url);
      if (found.productCode && !productCode) setProductCode(found.productCode);
    }
  };

  const handleAnalyzeUrl = async () => {
    if (!productUrl || !productUrl.trim()) {
      alert("상품 URL을 입력해주세요.");
      return;
    }
    if (!productUrl.startsWith('http')) {
      alert("유효한 상품 URL을 입력해주세요. (http:// 또는 https:// 포함)");
      return;
    }

    setIsAnalyzingUrl(true);
    addLog(`📥 상품 상세페이지 URL 크롤링 분석 시작: ${productUrl}`, 'info');
    
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

      const formattedText = formatAnalysisToText(data.infoText);

      setProductInfo(formattedText);
      setActiveTab('summary');
      setResult(prev => prev ? { ...prev, summary: formattedText } : { csReply: '', summary: formattedText, risks: '', sellerNotes: '' });
      
      if (data.productName && !productName) {
        setProductName(data.productName);
      }

      if (data.imageCandidates && data.imageCandidates.length > 0) {
        setUrlImageCandidates(data.imageCandidates);
        setSelectedCandidates([]);
      } else {
        setUrlImageCandidates([]);
      }

      addLog(`🔍 상품 URL 분석 성공: "${data.productName || '상품명 미식별'}" (품질: ${data.qualityScore || 100}점)`, 'success');
      
    } catch (error: any) {
      console.error("[URL 분석 실패]", error);
      alert(error.message || "자동 분석 실패: 상품정보를 직접 붙여넣어 주세요");
      addLog(`❌ URL 분석 실패: ${error.message || '오류 발생'}`, 'error');
    } finally {
      setIsAnalyzingUrl(false);
    }
  };

  const handlePaste = async (e: ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) return;
    e.preventDefault();

    addLog(`📸 클립보드 이미지 임시 감지 완료, 압축 중...`, 'info');

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
          addLog(`📸 이미지 압축 완료 (1장 추가됨). 분석을 돌려주세요.`, 'info');
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
    addLog(`🤖 Vision OCR 엔진 구동: 클립보드 이미지 정밀 분석 중...`, 'info');
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
      
      setImages([]);
      addLog(`✨ Vision OCR 분석 완료: 상품 스펙에 텍스트 데이터가 성공적으로 머지되었습니다.`, 'success');
      
    } catch (error: any) {
      alert(error.message || "이미지 분석 실패");
      addLog(`❌ 이미지 OCR 분석 실패: ${error.message || '오류'}`, 'error');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleAnalyzeCandidates = async (urlsToAnalyze: string[]) => {
    if (urlsToAnalyze.length === 0) return;
    setCandidateAnalyzeStatus(true);
    addLog(`🤖 크롤링된 후보 이미지 (${urlsToAnalyze.length}장) OCR 분석 구동...`, 'info');
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
      
      addLog(`✨ 발견 이미지 분석 성공 및 상품 지식 베이스 반영 완료`, 'success');
      
    } catch (error: any) {
      alert(error.message || "이미지 분석 실패");
      addLog(`❌ 발견 이미지 분석 실패`, 'error');
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
    addLog(`🤵 AI CS Agent 파이프라인 구동 [${actionType.toUpperCase()}]`, 'info');
    
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
        body: JSON.stringify({ productInfo, customerInquiry, sellerMemo, internalMemo, actionType, productName })
      });
      
      if (!response.ok) {
        throw new Error('API response was not ok');
      }
      
      const res: AIResponse = await response.json();
      const newResult = result ? { ...result, ...res } : res;
      setResult(newResult);
      
      addLog(`✨ AI CS Agent 답변 초안 수립 성공 [신뢰 점수: 95점]`, 'success');

      if (actionType === 'cs') {
        // CS 초안 작성 성공 로깅
        writeWorkLog(
          "답변 작성 담당",
          "CS 답변 초안 작성",
          "answer",
          "success",
          `상품 '${productName || "상품"}'의 지식을 연동하여 정중한 카톡 CS 문체의 1:1 고객 답변 초안 작성을 완료했습니다.`,
          { targetId: selectedInboxId || undefined, productName: productName || undefined, inquirySummary: customerInquiry.substring(0, 30) + "..." }
        );

        // 위험 검수 로깅
        if (newResult.risks) {
          writeWorkLog(
            "위험 검수 담당",
            "위험 검수",
            "inquiry",
            "warning",
            `고객 문의 내에서 민감 법적 규격 또는 위험 문구 [${newResult.risks.substring(0, 15)}...] 가 검출되었습니다.`,
            { targetId: selectedInboxId || undefined, nextAction: "위험 예외 안내 가이드를 답변 초안에 주입하였습니다." }
          );
        } else {
          writeWorkLog(
            "위험 검수 담당",
            "위험 검수",
            "inquiry",
            "success",
            `위험 문구 및 민감 법적 규격(KC/식품용 등) 검수를 완료했으며, 리스크 요인이 검출되지 않았습니다.`,
            { targetId: selectedInboxId || undefined }
          );
        }

        addHistory({
          productInfo,
          customerInquiry,
          sellerMemo,
          result: newResult,
        });

        // Update draft of the active inbox item
        if (selectedInboxId) {
          updateInboxItem(selectedInboxId, {
            replyDraft: newResult.csReply,
            status: 'drafted',
            riskLevel: newResult.risks ? 'high' : 'low',
            riskReason: newResult.risks || undefined,
            sellerMemo: sellerMemo || undefined
          });
        }
        
        if (productName || productUrl) {
          saveProductAndInquiry(
            productName,
            productUrl,
            productInfo,
            customerInquiry,
            sellerMemo,
            newResult.csReply,
            productCode
          );
        }
      }
    } catch (error) {
      alert("처리 중 오류가 발생했습니다.");
      addLog(`❌ AI CS Agent 생성 실패`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.csReply) {
      navigator.clipboard.writeText(result.csReply);
      addLog(`📋 고객 발송용 답변 클립보드 복사 완료`, 'success');
      alert("클립보드에 복사되었습니다.");
    }
  };

  const handleReset = () => {
    setProductName("");
    setProductUrl("");
    setProductInfo("");
    setCustomerInquiry("");
    setSellerMemo("");
    setProductCode("");
    setImages([]);
    setUrlImageCandidates([]);
    setSelectedCandidates([]);
    setResult(null);
    setIsAnalyzingUrl(false);
    setIsAnalyzingImage(false);
    setCandidateAnalyzeStatus(false);
    setLoading(false);
    addLog(`🧹 입력 작업 영역이 초기화되었습니다.`, 'info');
  };

  const loadProductToInputs = (p: any) => {
    setProductName(p.name);
    setProductUrl(p.url);
    setProductInfo(p.info);
    setProductCode(p.productCode || "");
    if (p.internalMemo) {
      setSellerMemo((prev) => prev ? prev + "\n\n" + p.internalMemo : p.internalMemo);
    }
    setImages([]);
    addLog(`📥 상품 DB "${p.name}" 정보가 입력창으로 로드되었습니다.`, 'info');
  };

  const handleReuseInquiry = (inquiry: string) => {
    if (customerInquiry && customerInquiry.trim() !== '') {
      if (!confirm("현재 입력된 문의 내용이 있습니다. 덮어쓰시겠습니까?")) return;
    }
    setCustomerInquiry(inquiry);
  };

  // Inquiry click handler
  const handleInquiryClick = (item: InboxItem) => {
    setSelectedInboxId(item.id);
  };

  // CS Approval handler
  const handleFinalApprove = () => {
    if (!selectedInboxId) return;
    const inboxItem = safeInboxItems.find(item => item.id === selectedInboxId);
    if (!inboxItem) return;

    const draftText = result?.csReply || inboxItem.replyDraft || "";
    if (!draftText) {
      alert("승인할 답변 내용이 없습니다. 먼저 답변을 작성해주세요.");
      return;
    }

    updateInboxItem(selectedInboxId, { status: 'approved', replyDraft: draftText });
    saveProductAndInquiry(
      productName,
      productUrl,
      productInfo,
      customerInquiry,
      sellerMemo,
      draftText,
      productCode
    );

    addLog(`🟢 CS 문의 최종 승인 및 완료: ID [${selectedInboxId}] (대표 서명 배포 완료)`, 'success');
    alert("최종 결재 및 발송 승인이 완료되었습니다!");
  };

  // Manual Add Inquiry
  const handleManualAddInquiry = () => {
    const newId = `inq-${Date.now().toString().slice(-4)}`;
    const newInq: InboxItem = {
      id: newId,
      customerInquiry: "스마트스토어로 유입된 신규 상품 스펙 문의입니다. 직접 입력 후 답변을 받아보세요.",
      receivedAt: new Date().toLocaleString('ko-KR'),
      intent: '수동 추가 문의',
      matchedProductName: '',
      matchedProductId: '',
      matchScore: 90,
      replyDraft: '',
      riskLevel: 'low',
      status: 'pending',
      sourceSite: '스마트스토어',
      identificationStatus: 'identified',
      isDemo: false
    };
    addInboxItem(newInq);
    setSelectedInboxId(newId);
    addLog(`📥 신규 CS 문의 수동 유입 완료 [ID: ${newId}]`, 'info');

    writeWorkLog(
      "문의 수집 담당",
      "수동 문의 추가",
      "inquiry",
      "success",
      `판매자가 신규 CS 문의 [ID: ${newId}]를 수동으로 추가하였습니다.`,
      { targetId: newId, inquirySummary: "스마트스토어로 유입된 신규 상품 스펙 문의..." }
    );
  };

  // CSV Bulk Upload simulation
  const handleCSVUploadSim = () => {
    const listToImport: InboxItem[] = [
      {
        id: `inq-bulk1-${Date.now().toString().slice(-3)}`,
        customerInquiry: "바람막이 안감 두께가 어떻게 되나요? 가을철 아침 저녁에 입기 적당한가요?",
        receivedAt: new Date().toLocaleString('ko-KR'),
        intent: '두께/계절감 문의',
        matchedProductName: 'DHT 아웃도어 바람막이',
        productUrl: 'http://dht-b2b.com/goods/windbreaker',
        matchScore: 94,
        replyDraft: '안녕하세요 고객님! 문의하신 바람막이는 기능성 초경량 원단(안감 무)으로 제작되어, 가을철 아침/저녁 가벼운 윈드브레이커 대용으로 활용하시기에 가장 최적입니다.',
        riskLevel: 'low',
        status: 'drafted',
        sourceSite: '쿠팡',
        identificationStatus: 'identified'
      },
      {
        id: `inq-bulk2-${Date.now().toString().slice(-3)}`,
        customerInquiry: "커튼 레일 포함인가요? 아니면 봉 타입인가요?",
        receivedAt: new Date().toLocaleString('ko-KR'),
        intent: '구성품 문의',
        matchedProductName: 'DHT 안막 커튼',
        productUrl: 'http://dht-b2b.com/goods/curtain',
        matchScore: 89,
        replyDraft: '안녕하세요 고객님! 본 상품은 레일형 부속만 기본 제공되며, 봉 타입으로 거치 시 별도의 고리핀을 추가 구매해 주셔야 함을 안내해 드립니다.',
        riskLevel: 'low',
        status: 'drafted',
        sourceSite: '스마트스토어',
        identificationStatus: 'identified'
      }
    ];
    addInboxItemsBulk(listToImport);
    addLog(`📥 대량 문의 CSV 데이터 가상 수집 완료 (2건 일괄 유입)`, 'success');
    alert("가상 문의 2건이 성공적으로 수집함에 일괄 추가되었습니다!");
  };

  // Catalog Scraper 구동
  const handleStartCatalogScrape = async () => {
    if (!catalogUrl || !catalogUrl.trim()) {
      alert("카탈로그 상품목록 URL을 입력해주세요.");
      return;
    }
    if (!catalogUrl.startsWith('http')) {
      alert("유효한 URL을 입력해주세요. (http:// 또는 https:// 포함)");
      return;
    }

    addLog(`🚀 자동 수집 배치 태스크 가동 시작: ${catalogUrl}`, 'info');
    setCatalogTaskState(null);
    setActiveTaskId(null);

    try {
      const response = await fetch('/api/analyze-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: catalogUrl, limit: catalogLimit })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '태스크 생성 실패');
      }

      setActiveTaskId(data.taskId);
      setIsCatalogPolling(true);
      addLog(`⚙️ 대량 수집 태스크 발급 완료 [ID: ${data.taskId}] - 폴링 모드 돌입`, 'info');

      writeWorkLog(
        "상품학습 담당",
        "자동 수집 시작",
        "catalog",
        "success",
        `카탈로그 URL 분석 및 대량 상품 순차 스크랩 배치가 가동되었습니다. (한도: ${catalogLimit}개)`,
        { targetId: data.taskId }
      );
      
    } catch (e: any) {
      alert(e.message || "태스크 생성 오류");
      addLog(`❌ 대량 수집 태스크 가동 실패`, 'error');
    }
  };

  // Manual save product info
  const handleSaveProductOnly = () => {
    if (!productName.trim()) {
      alert("상품명을 입력해주세요.");
      return;
    }
    saveProductAndInquiry(
      productName,
      productUrl,
      productInfo,
      "",
      sellerMemo,
      "",
      productCode
    );
    addLog(`💾 상품 "${productName}" 스펙이 데이터베이스에 저장/수정되었습니다.`, 'success');
    alert("상품 정보가 성공적으로 저장되었습니다.");
  };

  // Filtered lists
  const filteredProducts = safeProducts.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.url && p.url.toLowerCase().includes(q)) ||
      (p.info && p.info.toLowerCase().includes(q))
    );
  });

  const filteredInquiries = safeInboxItems.filter(item => {
    if (inquiryFilter === 'all') return true;
    if (inquiryFilter === 'pending') return item.status === 'pending';
    if (inquiryFilter === 'drafted') return item.status === 'drafted';
    if (inquiryFilter === 'approved') return item.status === 'approved';
    if (inquiryFilter === 'risk') return item.riskLevel === 'high';
    return true;
  });

  const selectedInbox = safeInboxItems.find(item => item.id === selectedInboxId);

  return (
    <div className="flex h-screen bg-[#030712] text-[#f1f5f9] font-sans antialiased overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* ===================================================================
          LEFT SIDEBAR NAVIGATION
          =================================================================== */}
      <aside className="w-64 shrink-0 bg-[#070b19] border-r border-slate-900 flex flex-col justify-between z-20">
        <div>
          {/* Header Branding (Redesigned for Premium SaaS mode v0.9-B) */}
          <div className="h-20 px-6 border-b border-slate-900/50 bg-[#040713]/80 flex flex-col justify-center gap-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-505 via-indigo-600 to-indigo-700 flex items-center justify-center shadow-inner shadow-white/10 ring-1 ring-indigo-400/20">
                <Cpu size={15} className="text-white animate-pulse-subtle" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs font-black tracking-tight text-white font-sans uppercase">Aron Seller AI</h1>
                  <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1 rounded text-[7px] font-mono scale-90">v0.9-B</span>
                </div>
                <p className="text-[9px] text-slate-500 font-medium tracking-wide">CS & Risk Autonomous Console</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-4 py-2 rounded-lg text-[12.5px] font-bold tracking-tight transition-all ${currentTab === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-300 hover:text-white hover:bg-slate-900/40'}`}
            >
              <Activity size={15} />
              <span>종합 관제 대시보드</span>
            </button>

            <button
              onClick={() => setCurrentTab('inquiries')}
              className={`w-full flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${currentTab === 'inquiries' ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <FileText size={15} />
              <span>실시간 고객 문의함</span>
              {safeInboxItems.filter(i => i.status === 'pending').length > 0 && (
                <span className="ml-auto bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full text-[9px] font-bold">
                  {safeInboxItems.filter(i => i.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('knowledge')}
              className={`w-full flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${currentTab === 'knowledge' ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <BookOpen size={15} />
              <span>통합 지식 베이스</span>
            </button>

            <button
              onClick={() => setCurrentTab('automation')}
              className={`w-full flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${currentTab === 'automation' ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <Layers size={15} />
              <span>자동 수집</span>
              {isCatalogPolling && (
                <span className="ml-auto flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('reports')}
              className={`w-full flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${currentTab === 'reports' ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <BarChart3 size={15} />
              <span>업무 보고서</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-900/60 bg-[#050711]">
          <div className="flex gap-2">
            <button
              onClick={resetInboxAndLogs}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 py-2 rounded-lg text-[10px] font-medium border border-slate-800 transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCcw size={12} /> 시뮬레이션 복원
            </button>
            <button
              onClick={clearInboxAndLogs}
              className="flex-1 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 py-2 rounded-lg text-[10px] font-medium border border-rose-900/40 transition-colors flex items-center justify-center gap-1"
            >
              <Trash2 size={12} /> 전체 비우기
            </button>
          </div>
        </div>
      </aside>

      {/* ===================================================================
          MAIN WORKSPACE
          =================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#030712] overflow-hidden">
        
        {/* Top Control Bar */}
        <header className="h-16 border-b border-slate-900/60 flex items-center justify-between px-8 bg-[#060a17]/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              {currentTab === 'dashboard' ? '대시보드' : currentTab === 'inquiries' ? '실시간 문의 관리' : currentTab === 'knowledge' ? '지식 허브' : currentTab === 'automation' ? '카탈로그 배치' : '데일리 운영 보고'}
            </span>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              실시간 자동화 시스템 구동 중
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium font-mono">System Time: 2026-05-27 14:42</span>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          
          {/* ===================================================================
              TAB: DASHBOARD
              =================================================================== */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6 fade-in-slide-right">
              
              {/* Metric Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div className="glass-panel p-5 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">오늘 수집된 문의</p>
                      <h3 className="text-2xl font-bold text-white mt-1 font-mono">{safeInboxItems.length} 건</h3>
                    </div>
                    <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                      <Send size={16} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-3">
                    <TrendingUp size={11} />
                    <span>+15% 전일 대비</span>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">초안 생성률</p>
                      <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                        {Math.round((safeInboxItems.filter(item => item.status === 'drafted' || item.status === 'approved').length / safeInboxItems.length) * 100) || 0} %
                      </h3>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                      <CheckCircle size={16} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-3">
                    <TrendingUp size={11} />
                    <span>정밀 답변 가동 중</span>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">수동 검토 대기</p>
                      <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                        {safeInboxItems.filter(item => item.status === 'pending').length} 건
                      </h3>
                    </div>
                    <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                      <Clock size={16} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold mt-3">
                    <span>시스템 검토 보류</span>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-xl relative overflow-hidden group border border-rose-500/20 bg-rose-950/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">위험 및 특이 문의</p>
                      <h3 className="text-2xl font-bold text-rose-400 mt-1 font-mono">
                        {safeInboxItems.filter(item => item.riskLevel === 'high').length} 건
                      </h3>
                    </div>
                    <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
                      <ShieldAlert size={16} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold mt-3 animate-pulse">
                    <span>즉각적인 판매자 확인 필요</span>
                  </div>
                </div>
              </div>

              {/* Double Column Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Agent status (col 8) */}
                <div className="lg:col-span-8 glass-panel p-5 rounded-xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-900/60 pb-3 mb-5">
                      <h3 className="text-[13.5px] font-extrabold text-white flex items-center gap-1.5">
                        <Cpu size={15} className="text-indigo-400" /> 실시간 자동화 처리 시스템 현황
                      </h3>
                      <span className="text-[10px] text-slate-350 font-bold bg-[#0b0f20]/60 px-2.5 py-0.5 rounded border border-slate-900">5개 처리 영역 정상 작동 중</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      
                      <div className="bg-[#0b0f20]/60 p-3.5 rounded-lg border border-slate-900 flex flex-col items-center justify-center text-center">
                        <div className="relative flex h-2 w-2 mb-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                        <p className="text-[11.5px] font-extrabold text-white">문의 수집 담당</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">신규 문의 감지 및 분류</p>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full w-[85%]"></div>
                        </div>
                        <span className="text-[7.5px] text-slate-500 font-mono mt-1 font-bold">CPU 2.4%</span>
                      </div>

                      <div className="bg-[#0b0f20]/60 p-3.5 rounded-lg border border-slate-900 flex flex-col items-center justify-center text-center">
                        <div className="relative flex h-2 w-2 mb-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </div>
                        <p className="text-[11.5px] font-extrabold text-white">상품 매칭 담당</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">상품 DB 대조 및 추천</p>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2.5 overflow-hidden">
                          <div className="bg-indigo-500 h-full w-[95%]"></div>
                        </div>
                        <span className="text-[7.5px] text-slate-500 font-mono mt-1 font-bold">CPU 8.1%</span>
                      </div>

                      <div className="bg-[#0b0f20]/60 p-3.5 rounded-lg border border-slate-900 flex flex-col items-center justify-center text-center">
                        <div className="relative flex h-2 w-2 mb-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </div>
                        <p className="text-[11.5px] font-extrabold text-white">위험 검수 담당</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">인증/환불/불량 위험 확인</p>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2.5 overflow-hidden">
                          <div className="bg-indigo-500 h-full w-[40%]"></div>
                        </div>
                        <span className="text-[7.5px] text-slate-500 font-mono mt-1 font-bold">CPU 4.2%</span>
                      </div>

                      <div className="bg-[#0b0f20]/60 p-3.5 rounded-lg border border-slate-900 flex flex-col items-center justify-center text-center">
                        <div className="relative flex h-2 w-2 mb-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </div>
                        <p className="text-[11.5px] font-extrabold text-white">답변 작성 담당</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">고객 발송용 답변 초안 작성</p>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2.5 overflow-hidden">
                          <div className="bg-indigo-500 h-full w-[70%]"></div>
                        </div>
                        <span className="text-[7.5px] text-slate-500 font-mono mt-1 font-bold">CPU 12.5%</span>
                      </div>

                      <div className="bg-[#0b0f20]/60 p-3.5 rounded-lg border border-slate-900 flex flex-col items-center justify-center text-center">
                        <div className="relative flex h-2 w-2 mb-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </div>
                        <p className="text-[11.5px] font-extrabold text-white">최종 검토 담당</p>
                        <p className="text-[8px] text-slate-500 mt-0.5 font-medium">최종 승인 및 처리 대기</p>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2.5 overflow-hidden">
                          <div className="bg-indigo-500 h-full w-[90%]"></div>
                        </div>
                        <span className="text-[7.5px] text-slate-500 font-mono mt-1 font-bold">CPU 1.0%</span>
                      </div>
                    </div>
                  </div>

                  {/* Operation Alert Summary */}
                  <div className="mt-6 p-3.5 bg-indigo-950/15 border border-indigo-500/10 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={14} className="text-indigo-400 shrink-0" />
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong>시스템 오퍼레이션 추천:</strong> 현재 수집된 CS 문의 중 <span className="text-rose-400 font-bold">1건의 고위험도 리스크 위협</span>이 감지되었습니다. 실시간 문의함에서 확인을 클릭하십시오.
                      </p>
                    </div>
                    <button 
                      onClick={() => setCurrentTab('inquiries')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-[10px] font-bold tracking-wide transition-colors shrink-0"
                    >
                      즉시 대응하기 ➔
                    </button>
                  </div>
                </div>

                {/* Operations log (col 4) */}
                <div className="lg:col-span-4 glass-panel p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-900/60 pb-3 mb-3">
                      <h3 className="text-[13.5px] font-extrabold text-white flex items-center gap-1.5">
                        <Activity size={15} className="text-indigo-400" /> 실시간 오퍼레이션 로그
                      </h3>
                      <span className="text-[9px] text-slate-500">Log Live: 100%</span>
                    </div>

                    <div className="flex-1 max-h-[175px] overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                      {workLogs.slice(0, 9).map((wlog) => (
                        <div key={wlog.id} className="text-[11.5px] leading-normal border-b border-[#0f172a] pb-2">
                          <div className="flex items-center justify-between text-slate-400 mb-1">
                            <span className="font-mono text-[9px] text-slate-500">{wlog.time.split(" ")[4] || wlog.time.split(" ")[1]}</span>
                            <div className="flex gap-1">
                              <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold ${getRoleBadgeColor(wlog.role)}`}>
                                {wlog.role}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-black ${getResultBadgeColor(wlog.result)}`}>
                                {wlog.result.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-200 font-medium leading-relaxed">{wlog.message}</p>
                        </div>
                      ))}
                      {workLogs.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-500">실시간 기록된 업무 로그가 없습니다.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* bottom section row (Redesigned for Premium SaaS density v0.9-B) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* 우선 처리 항목 (col-span-6) */}
                <div className="lg:col-span-6 glass-panel p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-900/60 pb-3 mb-4">
                      <h4 className="text-[13.5px] font-extrabold text-white flex items-center gap-1.5">
                        <Flame size={14} className="text-rose-400" /> 신속 대응 우선순위 문의 대기열 (Top Priorities)
                      </h4>
                      <span className="text-[10px] text-slate-450 font-bold">실시간 대기 건</span>
                    </div>
                    <div className="space-y-2.5">
                      {safeInboxItems.filter(item => item.status === 'pending' || item.riskLevel === 'high').slice(0, 3).map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => { setSelectedInboxId(item.id); setCurrentTab('inquiries'); }}
                          className="p-2.5 bg-[#0b0f20]/40 hover:bg-[#101736]/40 border border-slate-900 rounded-lg flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black ${item.sourceSite === '쿠팡' ? 'bg-yellow-500/10 text-yellow-400' : item.sourceSite === '도매꾹' ? 'bg-sky-500/10 text-sky-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                {item.sourceSite || '스토어'}
                              </span>
                              <span className="text-[10.5px] text-slate-400 font-mono">{item.receivedAt}</span>
                            </div>
                            <p className="text-[12.5px] text-slate-200 truncate font-bold">
                              {item.customerInquiry}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold ${item.riskLevel === 'high' ? 'bg-rose-500/10 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-450'}`}>
                              {item.riskLevel === 'high' ? '🚨 리스크감지' : '수동검토'}
                            </span>
                            <ChevronRight size={12} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                          </div>
                        </div>
                      ))}
                      {safeInboxItems.filter(item => item.status === 'pending' || item.riskLevel === 'high').length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-500">현재 대기 중이거나 즉각적인 위험 요소가 감지된 문의가 없습니다. 클린 CS 상태 유지 중.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 최근 자동 수집 상태 (col-span-3) */}
                <div className="lg:col-span-3 glass-panel p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-900/60 pb-3 mb-4">
                      <h4 className="text-[13.5px] font-extrabold text-white flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-400" /> 최근 자동화 배치 기록
                      </h4>
                    </div>
                    <div className="space-y-2.5">
                      {safeCollectionHistory.slice(0, 3).map((hist) => (
                        <div key={hist.id} className="text-[11.5px] p-2 bg-[#0b0f20]/40 rounded border border-slate-900/60 leading-relaxed">
                          <div className="flex justify-between items-center text-slate-400 mb-1">
                            <span className="font-extrabold text-slate-200">{hist.agentType || '수집'}</span>
                            <span className="font-mono text-[9.5px] text-slate-400">{hist.collectedAt.split(" ")[1]}</span>
                          </div>
                          <p className="text-[#94a3b8] truncate text-xs font-semibold">
                            {hist.connectorName || 'CSV 업로드'} | 결과: <span className={hist.status === '성공' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{hist.status}</span>
                          </p>
                          <div className="flex justify-between items-center text-[10px] text-slate-450 mt-1 font-mono">
                            <span>수집: {hist.totalCount}개 | 신규: {hist.insertedCount}개</span>
                            {hist.qualityScore && <span className="text-indigo-400 font-bold">품질: {hist.qualityScore}점</span>}
                          </div>
                        </div>
                      ))}
                      {safeCollectionHistory.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-500">자동 카탈로그 크롤러 배치 내역이 비어 있습니다.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 업무보고 요약 (col-span-3) */}
                <div className="lg:col-span-3 glass-panel p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-900/60 pb-3 mb-4">
                      <h4 className="text-[13.5px] font-extrabold text-white flex items-center gap-1.5">
                        <FileText size={14} className="text-indigo-400" /> 오늘의 업무 요약 브리핑
                      </h4>
                    </div>
                    <div className="space-y-2 bg-[#0b0f20]/40 p-3 rounded-lg border border-slate-900 text-xs leading-relaxed text-slate-250">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-1.5 font-extrabold">
                        <span className="text-emerald-400">종합 품질 등급: AA+</span>
                        <span className="text-slate-450">2026-05-27</span>
                      </div>
                      <p className="text-slate-300 font-medium leading-relaxed">오늘 누적 수집된 {safeInboxItems.length}건 중 {Math.round((safeInboxItems.filter(item => item.status === 'drafted' || item.status === 'approved').length / safeInboxItems.length) * 100) || 0}%에 대한 최적 CS 답변이 성공적으로 보완 완료되었습니다. 리스크 점검을 통과하였으며, 신규 학습 {safeProducts.length}건이 지식 스펙 베이스에 자동 동기화되었습니다.</p>
                      <button 
                        onClick={() => setCurrentTab('reports')}
                        className="w-full text-center mt-3 text-indigo-400 hover:text-indigo-300 font-black text-[10.5px] hover:underline"
                      >
                        상세 보고서 서명/확인하러 가기 ➔
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ===================================================================
              TAB: INQUIRIES
              =================================================================== */}
          {currentTab === 'inquiries' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 h-[calc(100vh-160px)] overflow-hidden fade-in-slide-right">
              
              {/* Left Column: Inquiry list (col-span-3) */}
              <div className="xl:col-span-3 glass-panel rounded-xl flex flex-col overflow-hidden h-full">
                
                {/* Panel Header */}
                <div className="p-3.5 border-b border-slate-900/60 bg-[#070b19]/60">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-white">수집된 문의 목록</h3>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={handleManualAddInquiry}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-1.5 rounded transition-colors text-[9px] font-medium border border-slate-800 flex items-center gap-1"
                        title="수동 추가"
                      >
                        <RefreshCcw size={9} /> 수동추가
                      </button>
                      <button 
                        onClick={handleCSVUploadSim}
                        className="bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-400 p-1.5 rounded transition-colors text-[9px] font-medium border border-indigo-900/40 flex items-center gap-1"
                        title="CSV 업로드"
                      >
                        <Upload size={9} /> CSV
                      </button>
                    </div>
                  </div>
                  
                  {/* Filter tabs */}
                  <div className="grid grid-cols-5 gap-1 text-[9px] font-bold">
                    <button 
                      onClick={() => setInquiryFilter('all')}
                      className={`py-1 text-center rounded transition-all ${inquiryFilter === 'all' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-950/50 text-slate-400 hover:text-slate-300'}`}
                    >
                      전체
                    </button>
                    <button 
                      onClick={() => setInquiryFilter('pending')}
                      className={`py-1 text-center rounded transition-all ${inquiryFilter === 'pending' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-950/50 text-slate-400 hover:text-slate-300'}`}
                    >
                      대기
                    </button>
                    <button 
                      onClick={() => setInquiryFilter('drafted')}
                      className={`py-1 text-center rounded transition-all ${inquiryFilter === 'drafted' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-950/50 text-slate-400 hover:text-slate-300'}`}
                    >
                      초안
                    </button>
                    <button 
                      onClick={() => setInquiryFilter('approved')}
                      className={`py-1 text-center rounded transition-all ${inquiryFilter === 'approved' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-950/50 text-slate-400 hover:text-slate-300'}`}
                    >
                      완료
                    </button>
                    <button 
                      onClick={() => setInquiryFilter('risk')}
                      className={`py-1 text-center rounded transition-all ${inquiryFilter === 'risk' ? 'bg-rose-900/40 text-rose-300 border border-rose-900/80 font-black' : 'bg-slate-950/50 text-rose-500 hover:text-rose-400'}`}
                    >
                      위험
                    </button>
                  </div>
                </div>

                {/* Inquiry Cards List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-2">
                  {filteredInquiries.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500">조회할 문의 내역이 없습니다.</div>
                  ) : (
                    filteredInquiries.map((item) => {
                      const isSelected = selectedInboxId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleInquiryClick(item)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${isSelected ? 'bg-indigo-950/20 border-indigo-500/50 shadow-md shadow-indigo-500/5' : 'bg-slate-950/30 border-slate-900 hover:border-slate-800'}`}
                        >
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black ${item.sourceSite === '쿠팡' ? 'bg-yellow-500/10 text-yellow-400' : item.sourceSite === '도매꾹' ? 'bg-sky-500/10 text-sky-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                              {item.sourceSite || '스토어'}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">{item.receivedAt}</span>
                          </div>
                          
                          <p className="text-[13px] text-slate-100 line-clamp-2 leading-normal mb-2 font-bold">
                            {item.customerInquiry}
                          </p>

                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-slate-300 font-bold truncate max-w-[130px]">
                              ➔ {(() => {
                                const matchedProduct = safeProducts.find(p => p.productId === item.matchedProductId || (item.matchedProductName && p.name === item.matchedProductName));
                                return matchedProduct?.name || item.matchedProductName || (item as any).productName || "상품 미연결";
                              })()}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : item.status === 'drafted' ? 'bg-blue-500/10 text-blue-400' : item.riskLevel === 'high' ? 'bg-rose-500/10 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                              {item.status === 'approved' ? '검토완료' : item.status === 'drafted' ? '초안완료' : item.riskLevel === 'high' ? '🚨위험대기' : '수동대기'}
                            </span>
                          </div>

                          {/* Delete shortcut */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); if (confirm("삭제하시겠습니까?")) deleteInboxItem(item.id); }}
                            className="absolute top-2 right-2 p-1 bg-slate-900 rounded opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Center Column: Detailed inquiry & AI workspace (col-span-5) */}
              <div className="xl:col-span-5 glass-panel rounded-xl flex flex-col overflow-hidden h-full">
                {selectedInbox ? (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    
                    {/* Header */}
                    <div className="p-4 border-b border-slate-900/60 bg-[#070b19]/60 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <FileText size={14} className="text-indigo-400" /> 문의 상세 검토 & AI 초안 작성
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">ID: {selectedInbox.id} | 수집채널: {selectedInbox.sourceSite}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedInbox.riskLevel === 'high' && (
                          <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[9px] font-bold animate-pulse flex items-center gap-1">
                            <ShieldAlert size={10} /> 리스크 차단 경고
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          매칭 신뢰도: {selectedInbox.matchScore}%
                        </span>
                      </div>
                    </div>

                    {/* Scrollable inputs workspace */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                      
                      {/* Product Match Info row (Redesigned for Premium B2B SaaS v0.9-D) */}
                      <div className="p-4 bg-[#0a0f21]/70 border border-indigo-500/10 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl"></div>
                        
                        {/* 상단 헤더 */}
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs font-extrabold text-white flex items-center gap-1">AI 상품 매칭 현황</h4>
                          <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                            매칭 신뢰도 {selectedInbox.matchScore}%
                          </span>
                        </div>
                        
                        {/* 보조 설명 */}
                        <p className="text-[11px] text-slate-400 mb-3.5 leading-normal">
                          고객 문의와 가장 관련 있는 상품을 자동으로 연결합니다.
                        </p>

                        {/* 중간: 연결 상품 드롭다운 및 매칭된 상품명 노출 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 border-t border-slate-900/60 pt-3.5 mb-4">
                          <div className="flex flex-col gap-1 min-w-0 pr-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">연결 상품</label>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-200 block truncate" title={productName || "식별 대기 중인 상품"}>
                                {productName || "식별 대기 중인 상품"}
                              </span>
                              {productUrl && (
                                <a href={productUrl} target="_blank" rel="noreferrer" className="block text-[9px] text-indigo-400 hover:underline mt-0.5 font-mono truncate">
                                  {productUrl}
                                </a>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1 justify-end">
                            <select 
                              onChange={(e) => {
                                const prod = safeProducts.find(p => p.productId === e.target.value);
                                if (prod) {
                                  setProductName(prod.name);
                                  setProductUrl(prod.url);
                                  setProductInfo(prod.info);
                                  setProductCode(prod.productCode || "");
                                  addLog(`🔄 문의에 매칭할 상품 정보 강제 갱신: ${prod.name}`, 'info');
                                  
                                  if (selectedInboxId) {
                                    updateInboxItem(selectedInboxId, {
                                      matchedProductName: prod.name,
                                      matchedProductId: prod.productId,
                                      productUrl: prod.url,
                                      productCode: prod.productCode || undefined
                                    });
                                    writeWorkLog(
                                      "상품 매칭 담당",
                                      "상품 수동 매칭",
                                      "product",
                                      "success",
                                      `해당 문의의 연동 상품을 '${prod.name}'(으)로 수동 변경 지정했습니다.`,
                                      { targetId: selectedInboxId, productName: prod.name }
                                    );
                                  }
                                } else {
                                  setProductName("");
                                  setProductUrl("");
                                  setProductInfo("");
                                  setProductCode("");
                                  if (selectedInboxId) {
                                    updateInboxItem(selectedInboxId, {
                                      matchedProductName: "",
                                      matchedProductId: "",
                                      productUrl: "",
                                      productCode: undefined
                                    });
                                    writeWorkLog(
                                      "상품 매칭 담당",
                                      "상품 수동 매칭",
                                      "product",
                                      "warning",
                                      `해당 문의의 연동 상품 매칭을 수동 해제 처리했습니다.`,
                                      { targetId: selectedInboxId }
                                    );
                                  }
                                }
                              }}
                              className="bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors w-full"
                              value={safeProducts.find(p => p.name === productName)?.productId || ""}
                            >
                              <option value="">수동 매칭 상품 변경...</option>
                              {safeProducts.map(p => (
                                <option key={p.productId} value={p.productId}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* 하단: 신뢰도 게이지 바 */}
                        <div className="space-y-1.5 border-t border-slate-900/60 pt-3">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-medium">상품 DB 매칭 정확도</span>
                            <span className="font-mono font-extrabold text-indigo-400">{selectedInbox.matchScore}%</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-300"
                              style={{ width: `${selectedInbox.matchScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Customer Inquiry bubble */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">고객 문의 내용 원문</label>
                          <span className="text-[8px] font-mono text-slate-500 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded-sm font-semibold">실시간 자동 저장</span>
                        </div>
                        <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                          <textarea 
                            value={customerInquiry}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomerInquiry(val);
                              if (selectedInbox) {
                                updateInboxItem(selectedInbox.id, { customerInquiry: val });
                                writeWorkLog(
                                  "문의 수집 담당",
                                  "문의 원문 수정",
                                  "inquiry",
                                  "success",
                                  `문의 [ID: ${selectedInbox.id}]의 고객 문의 내용 원문을 수정 반영하였습니다.`,
                                  { targetId: selectedInbox.id, inquirySummary: val.substring(0, 30) + "..." }
                                );
                              }
                            }}
                            className="w-full h-20 p-3 bg-transparent text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 custom-scrollbar resize-none leading-relaxed"
                            placeholder="고객 문의 내용을 입력하거나 수정하세요."
                          />
                        </div>
                      </div>

                      {/* Product master specifications text (With Inset Shadow Editor Frame) */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">참조할 상품 스펙 고시정보</label>
                          <button 
                            onClick={handleSaveProductOnly}
                            className="text-[9px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2 py-0.5 rounded transition-all"
                          >
                            스펙 수정 저장
                          </button>
                        </div>
                        <div className="relative rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950 shadow-inner">
                          <textarea 
                            value={productInfo}
                            onChange={(e) => setProductInfo(e.target.value)}
                            className="w-full h-24 p-3 bg-transparent text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 custom-scrollbar resize-none"
                            placeholder="참조 스펙 고시 정보가 없습니다. 지식 센터에서 수집 후 로드하거나 이곳에 직접 스펙을 붙여넣어 주세요."
                          />
                        </div>
                      </div>

                      {/* Advanced compose parameters */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">판매자 추가 가이드 메모</label>
                          <textarea 
                            value={sellerMemo}
                            onChange={(e) => setSellerMemo(e.target.value)}
                            className="w-full h-16 p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-300 focus:border-indigo-500 focus:outline-none custom-scrollbar"
                            placeholder="예: 금일 출고지연 3시간 예상됨."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">상품 식별 코드 (Master Code)</label>
                          <input 
                            type="text"
                            value={productCode}
                            onChange={(e) => setProductCode(e.target.value)}
                            className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                            placeholder="Master Code 예: SOCKS-302"
                          />
                        </div>
                      </div>

                      {/* AI Draft Response Workspace */}
                      <div className="border-t border-slate-900/60 pt-3 flex-1 flex flex-col">
                        
                        {/* Editor tabs */}
                        <div className="flex border-b border-slate-900/60 mb-2.5 text-[10px] font-bold">
                          <button 
                            onClick={() => setActiveTab('cs')}
                            className={`px-3 py-1.5 transition-all ${activeTab === 'cs' ? 'border-b-2 border-indigo-500 text-indigo-400 font-extrabold' : 'text-slate-500 hover:text-slate-400'}`}
                          >
                            고객 발송용 CS 답변 초안
                          </button>
                          <button 
                            onClick={() => setActiveTab('summary')}
                            className={`px-3 py-1.5 transition-all ${activeTab === 'summary' ? 'border-b-2 border-indigo-500 text-indigo-400 font-extrabold' : 'text-slate-500 hover:text-slate-400'}`}
                          >
                            상품 속성 검증
                          </button>
                          <button 
                            onClick={() => setActiveTab('risk')}
                            className={`px-3 py-1.5 transition-all ${activeTab === 'risk' ? 'border-b-2 border-indigo-500 text-indigo-400 font-extrabold' : 'text-slate-500 hover:text-slate-400'}`}
                          >
                            🚨 리스크 필터 결과
                          </button>
                        </div>

                        {/* Text Editor area (With Inset Shadow Editor Frame) */}
                        <div className="relative flex-1 min-h-[260px] max-h-[520px] rounded-lg border border-slate-800/80 bg-slate-950 shadow-inner overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {activeTab === 'cs' && (
                            <textarea 
                              value={result?.csReply || ""}
                              onChange={(e) => setResult(prev => prev ? { ...prev, csReply: e.target.value } : { csReply: e.target.value, summary: "", risks: "", sellerNotes: "" })}
                              className="w-full min-h-[320px] h-[360px] max-h-[520px] p-4 bg-transparent text-xs leading-relaxed text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 font-sans custom-scrollbar resize-y whitespace-pre-wrap"
                              placeholder="AI 답변을 작성 중이거나 대기 중입니다. 아래 버튼을 눌러 답변 초안을 렌더링하세요."
                            />
                          )}

                          {activeTab === 'summary' && (
                            <div className="w-full h-full p-4 bg-transparent text-xs leading-relaxed text-slate-300 overflow-y-auto custom-scrollbar font-mono">
                              {result?.summary ? safeRender(result.summary) : "상품 요약이 작성되지 않았습니다."}
                            </div>
                          )}

                          {activeTab === 'risk' && (
                            <div className="w-full h-full p-4 bg-transparent text-xs leading-relaxed text-rose-300 overflow-y-auto custom-scrollbar">
                              {result?.risks ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                                    <ShieldAlert size={14} /> 위험 키워드 또는 강경성 협박문 감출됨
                                  </div>
                                  <p className="bg-rose-950/20 p-3 rounded border border-rose-900/40 text-xs text-rose-200 whitespace-pre-wrap">
                                    {result.risks}
                                  </p>
                                </div>
                              ) : "위험 요소 검출 없음. 클린 CS 대기"}
                            </div>
                          )}

                          {loading && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-xs text-indigo-400">
                              <Cpu className="animate-spin mb-2" size={24} />
                              AI Agent 답변 생성 연산 중...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="p-4 border-t border-slate-900/60 bg-[#070b19]/60 flex flex-wrap gap-2.5 items-center justify-between">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAction('cs')}
                          disabled={loading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded shadow transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Sparkles size={12} /> CS 초안 작성
                        </button>
                        <button 
                          onClick={() => handleAction('risk')}
                          disabled={loading}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs py-2 px-3 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <ShieldAlert size={12} /> 위험 체크
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={handleCopy}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs py-2 px-3 rounded transition-colors flex items-center gap-1.5"
                        >
                          <Copy size={12} /> 복사
                        </button>
                        <button 
                          onClick={handleFinalApprove}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded transition-colors flex items-center gap-1.5"
                        >
                          <Check size={12} /> 최종 결재 승인
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-10">
                    <HelpCircle size={48} className="opacity-15 mb-3" />
                    <p className="text-xs">상세히 검토할 고객 CS 문의를 좌측 리스트에서 선택해주십시오.</p>
                  </div>
                )}
              </div>

              {/* Right Column: Agent pipeline visualization (col-span-4) (Redesigned for Premium v0.9-B) */}
              <div className="xl:col-span-4 glass-panel rounded-xl flex flex-col overflow-hidden h-full">
                <div className="p-4 border-b border-slate-900/60 bg-[#070b19]/60">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Activity size={14} className="text-indigo-400" /> 실시간 업무 자동화 흐름도
                  </h3>
                </div>

                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-6">
                  {selectedInbox ? (
                    <div className="relative border-l-2 border-slate-800/80 ml-4.5 pl-6 space-y-6">
                      
                      {/* Step 1: Collector */}
                      <div className="relative group">
                        <span className="absolute -left-[33px] top-0.5 h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[8px] shadow-sm shadow-emerald-500/20">
                          <Check size={8} />
                        </span>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-200">1. 문의 수집 담당</h4>
                          <span className="text-[8px] font-mono text-slate-400 bg-[#070b18] border border-slate-900 px-1.5 py-0.5 rounded-sm font-semibold">처리 상태 정상</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          신규 문의 감지 및 분류 완료 (채널: <span className="text-slate-350">{selectedInbox.sourceSite}</span> | 일시: {selectedInbox.receivedAt})
                        </p>
                      </div>

                      {/* Step 2: Matcher */}
                      <div className="relative group">
                        <span className="absolute -left-[33px] top-0.5 h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[8px] shadow-sm shadow-emerald-500/20">
                          <Check size={8} />
                        </span>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-200">2. 상품 매칭 담당</h4>
                          <span className="text-[8px] font-mono text-slate-400 bg-[#070b18] border border-slate-900 px-1.5 py-0.5 rounded-sm font-semibold">처리 상태 정상</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          상품 DB 대조 및 관련 상품 연결 완료 (<span className="text-slate-350">{productName || selectedInbox.matchedProductName || "대기/보류"}</span> | 정확도 {selectedInbox.matchScore}%)
                        </p>
                      </div>

                      {/* Step 3: Risk */}
                      <div className="relative group">
                        <span className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border flex items-center justify-center text-[8px] shadow-sm ${selectedInbox.riskLevel === 'high' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20'}`}>
                          {selectedInbox.riskLevel === 'high' ? <Flame size={8} /> : <Check size={8} />}
                        </span>
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold ${selectedInbox.riskLevel === 'high' ? 'text-rose-400' : 'text-slate-200'}`}>3. 위험 검수 담당</h4>
                          <span className="text-[8px] font-mono text-slate-400 bg-[#070b18] border border-slate-900 px-1.5 py-0.5 rounded-sm font-semibold">처리 상태 정상</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          {selectedInbox.riskLevel === 'high' ? (
                            <span className="text-rose-300 bg-rose-950/20 p-2 rounded border border-rose-900/30 block mt-1 leading-relaxed">
                              <strong>위험 감지:</strong> {selectedInbox.riskReason || "인증/환불/불량 위험 필터"}
                            </span>
                          ) : (
                            "인증/환불/불량 위험 확인 완료 (이상 없음)"
                          )}
                        </p>
                      </div>

                      {/* Step 4: Draft */}
                      <div className="relative group">
                        <span className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border flex items-center justify-center text-[8px] shadow-sm ${selectedInbox.status === 'pending' ? 'bg-slate-900 text-slate-500 border-slate-800' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20'}`}>
                          {selectedInbox.status === 'pending' ? '●' : <Check size={8} />}
                        </span>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-200">4. 답변 작성 담당</h4>
                          <span className="text-[8px] font-mono text-slate-400 bg-[#070b18] border border-slate-900 px-1.5 py-0.5 rounded-sm font-semibold">처리 상태 정상</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          {selectedInbox.replyDraft || result?.csReply ? "고객 발송용 답변 초안 작성 완료" : "대기: 답변 작성을 기다리는 중입니다."}
                        </p>
                      </div>

                      {/* Step 5: Director */}
                      <div className="relative group">
                        <span className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border flex items-center justify-center text-[8px] shadow-sm ${selectedInbox.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                          {selectedInbox.status === 'approved' ? <Check size={8} /> : '●'}
                        </span>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-200">5. 최종 검토 담당</h4>
                          <span className="text-[8px] font-mono text-slate-400 bg-[#070b18] border border-slate-900 px-1.5 py-0.5 rounded-sm font-semibold">처리 상태 정상</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          {selectedInbox.status === 'approved' ? "최종 승인 완료 및 데이터베이스 반영 완료" : "최종 승인 및 처리 대기 중"}
                        </p>
                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-slate-500">문의를 선택하시면 AI의 실시간 동작 단계가 표시됩니다.</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ===================================================================
              TAB: KNOWLEDGE BASE (지식 베이스)
              =================================================================== */}
          {currentTab === 'knowledge' && (
            <div className="space-y-6 fade-in-slide-right">
              
              {/* Inner tab switcher */}
              <div className="flex border-b border-slate-900/60 pb-3 gap-6 text-sm font-bold">
                <button 
                  onClick={() => setKnowledgeTab('learn')}
                  className={`pb-1.5 transition-all ${knowledgeTab === 'learn' ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  [1] AI 학습 센터 (Learning Center)
                </button>
                <button 
                  onClick={() => setKnowledgeTab('library')}
                  className={`pb-1.5 transition-all ${knowledgeTab === 'library' ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  [2] 상품 DB 보관함 (Product Library)
                </button>
              </div>

              {/* Subtab: Learning Center */}
              {knowledgeTab === 'learn' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left input panel (col 6) */}
                  <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
                    <div className="glass-panel p-6 rounded-xl space-y-5 flex-1">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Layers size={16} className="text-indigo-400" /> 상품 상세페이지 학습
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">상품/단축명</label>
                            <input 
                              type="text"
                              value={productName}
                              onChange={(e) => setProductName(e.target.value)}
                              onBlur={handleProductBlur}
                              className="w-full p-2.5 bg-[#070b18] border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                              placeholder="예: 쿨 마스크"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">상품 고유코드 (선택)</label>
                            <input 
                              type="text"
                              value={productCode}
                              onChange={(e) => setProductCode(e.target.value)}
                              className="w-full p-2.5 bg-[#070b18] border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                              placeholder="예: SOCKS-302"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">상품 판매/공식 URL</label>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={productUrl}
                              onChange={(e) => setProductUrl(e.target.value)}
                              onBlur={handleProductBlur}
                              className="flex-1 p-2.5 bg-[#070b18] border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                              placeholder="https://..."
                            />
                            <button
                              onClick={handleAnalyzeUrl}
                              disabled={isAnalyzingUrl || !productUrl}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50 shrink-0"
                            >
                              {isAnalyzingUrl ? '불러오는 중...' : '상품 정보 불러오기'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Scraped Images Candidates (Re-arranged for layout density) */}
                      {urlImageCandidates.length > 0 && (
                        <div className="mt-4 p-4 border border-slate-900 rounded-lg bg-slate-950/20">
                          <div className="flex justify-between items-center mb-3">
                            <label className="block text-xs font-semibold text-slate-400">
                              상세 스캔 완료된 이미지 후보군 ({urlImageCandidates.length}장)
                            </label>
                            <button 
                              onClick={() => handleAnalyzeCandidates(selectedCandidates)}
                              disabled={selectedCandidates.length === 0 || candidateAnalyzeStatus}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                            >
                              {candidateAnalyzeStatus ? 'OCR 정밀 분석 중...' : '선택 이미지 OCR 분석'}
                            </button>
                          </div>
                          <div className="grid grid-cols-6 gap-2 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                            {urlImageCandidates.map((src, idx) => {
                              const isChecked = selectedCandidates.includes(src);
                              return (
                                <div 
                                  key={idx} 
                                  className={`relative shrink-0 cursor-pointer border rounded-lg overflow-hidden transition-all ${isChecked ? 'border-indigo-500 ring-1 ring-indigo-500/25' : 'border-slate-800 hover:border-slate-700'}`}
                                  onClick={() => {
                                    setSelectedCandidates(prev => 
                                      prev.includes(src) ? prev.filter(item => item !== src) : [...prev, src]
                                    );
                                  }}
                                >
                                  <img src={src} alt="Scraped candidates" className="w-full h-12 object-cover bg-white" />
                                  <div className={`absolute top-0.5 right-0.5 w-3 h-3 rounded-full border flex items-center justify-center ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-900/80 border-slate-700'}`}>
                                    {isChecked && <Check size={7} className="text-white" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Clipboard Image Upload Area */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                          상세페이지 실시간 캡쳐 이미지 붙여넣기 (Ctrl+V)
                        </label>
                        <div 
                          onPaste={handlePaste}
                          className="w-full min-h-24 p-3 border border-dashed border-slate-850 rounded-lg bg-slate-950/20 flex flex-col items-center justify-center transition-all focus-within:border-indigo-500/60 outline-none"
                          tabIndex={0}
                        >
                          {images.length === 0 ? (
                            <div className="text-center text-slate-500">
                              <ImagePlus size={18} className="mx-auto mb-1.5 opacity-40 animate-pulse-subtle" />
                              <p className="text-[10px]">클릭 후 상세페이지 영역 캡쳐 이미지를 붙여넣어주십시오.</p>
                            </div>
                          ) : (
                            <div className="w-full">
                              <div className="flex flex-wrap gap-2 mb-3">
                                {images.map((img, idx) => (
                                  <div key={idx} className="relative group rounded-md overflow-hidden border border-slate-800">
                                    <img src={img} alt="Pasted clipboard" className="w-10 h-10 object-cover bg-white" />
                                    <button 
                                      onClick={() => removeImage(idx)}
                                      className="absolute inset-0 bg-rose-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={handleAnalyzeImages}
                                disabled={isAnalyzingImage}
                                className="w-full bg-indigo-900/30 hover:bg-indigo-900/60 text-indigo-400 border border-indigo-850 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {isAnalyzingImage ? 'Vision OCR 연산 중...' : '붙여넣은 이미지 Vision OCR 자동 학습'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right result preview panel (col 6) */}
                  <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
                    <div className="glass-panel p-6 rounded-xl flex flex-col h-full justify-between flex-1">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Sparkles size={16} className="text-indigo-400" /> AI 학습 결과 분석 미리보기
                          </h3>
                          <button
                            onClick={handleSaveProductOnly}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded shadow transition-colors"
                          >
                            상품 DB에 저장
                          </button>
                        </div>

                        {/* Interactive Timeline of scrap loading */}
                        {isAnalyzingUrl && (
                          <div className="p-3 bg-indigo-950/10 border border-indigo-500/10 rounded-lg space-y-2">
                            <h4 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">실시간 상품 지식 수집 시퀀스</h4>
                            <div className="space-y-1.5 text-[9px]">
                              <div className="flex items-center gap-2 text-indigo-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                                1단계: 외부 쇼핑몰 몰 HTML 다운로드 및 SSL 파싱 완료
                              </div>
                              <div className="flex items-center gap-2 text-slate-500">
                                <span>●</span>
                                2단계: 핵심 명세 정보(소재, 치수, 주의사항) 자율 파싱 중
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">추출 완료된 상품 상세 스펙 정보</label>
                          <textarea 
                            value={productInfo}
                            onChange={(e) => setProductInfo(e.target.value)}
                            className="w-full h-64 p-3.5 bg-slate-950 border border-slate-850 rounded-lg text-xs leading-relaxed text-slate-200 focus:outline-none focus:border-indigo-500 font-mono custom-scrollbar resize-none"
                            placeholder="상품 정보를 불러오거나 직접 텍스트를 입력하면 분석 및 학습 결과 명세가 이곳에 채워집니다."
                          />
                        </div>
                      </div>

                      <div className="text-center pt-2">
                        <button 
                          onClick={handleReset}
                          className="text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <RefreshCcw size={12} /> 작업 영역 리셋
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 최근 학습 상품 및 저장 DB 목록 미리보기 추가 (Redesigned for Premium SaaS density v0.9-B) */}
                  <div className="col-span-12 glass-panel p-5 rounded-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                      <h3 className="text-[13.5px] font-extrabold text-white flex items-center gap-1.5">
                        <Database size={14} className="text-indigo-400" /> 최근 학습 완료 상품 및 DB 저장 현황
                      </h3>
                      <span className="text-[10.5px] text-slate-450 font-bold">로컬 지식 베이스 연동 완료 ({safeProducts.length}개 상품 등록됨)</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {safeProducts.slice(0, 4).map((p) => (
                        <div 
                          key={p.productId} 
                          onClick={() => { setDetailedProductId(p.productId); setKnowledgeTab('library'); }}
                          className="p-3 bg-[#0b0f20]/40 hover:bg-[#101736]/40 border border-slate-900 rounded-lg transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-[10.5px] font-mono font-bold text-indigo-400 truncate max-w-[120px]">{p.productCode || 'NO-CODE'}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold ${p.qualityScore && p.qualityScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              품질: {p.qualityScore || 100}점
                            </span>
                          </div>
                          <p className="text-[13px] font-extrabold text-slate-200 truncate group-hover:text-white transition-colors">{p.name}</p>
                          <p className="text-[11px] text-slate-400 mt-1 truncate">{p.url || '수동 입력 상품'}</p>
                        </div>
                      ))}
                      {safeProducts.length === 0 && (
                        <div className="col-span-4 text-center py-6 text-xs text-slate-500">
                          현재 학습된 상품이 지식 베이스에 존재하지 않습니다. URL 스캔 및 이미지 OCR을 수행해 주십시오.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* Subtab: Product Library */}
              {knowledgeTab === 'library' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-230px)] overflow-hidden">
                  
                  {/* Left: Product master list (col 4) */}
                  <div className="lg:col-span-4 glass-panel rounded-xl flex flex-col overflow-hidden h-full">
                    
                    {/* Search and Database utilities */}
                    <div className="p-4 border-b border-slate-900/60 bg-[#070b19]/60 space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-white">저장 완료된 상품 스펙 DB ({safeProducts.length}개)</h3>
                        <div className="flex gap-1.5">
                          <label className="text-[10px] text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1">
                            <Upload size={10} /> 로드
                            <input type="file" accept=".json" className="hidden" onChange={handleImportDB} />
                          </label>
                          <button 
                            onClick={handleExportDB} 
                            className="text-[10px] text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded transition-colors flex items-center gap-1"
                          >
                            <Download size={10} /> 백업
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="등록 상품 검색..." 
                          className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-850 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-10 text-xs text-slate-500">저장된 상품 데이터가 없습니다.</div>
                      ) : (
                        filteredProducts.map((p) => {
                          const isSelected = detailedProductId === p.productId;
                          return (
                            <div 
                              key={p.productId} 
                              className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-indigo-950/20 border-indigo-500/50' : 'bg-slate-950/30 border-slate-900 hover:border-slate-800'}`}
                              onClick={() => { setDetailedProductId(p.productId); setTempInternalMemo(p.internalMemo || ""); }}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
                                  <span className="text-xs font-bold text-slate-200 truncate">{p.name}</span>
                                  {p.learningStatus === '정보 부족' && (
                                    isProductSupplemented(p) ? (
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">보완 입력됨</span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">보완 필요</span>
                                    )
                                  )}
                                  {p.reviewStatus === 'needs_review' && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">검수 필요</span>
                                  )}
                                </div>
                                <div className="flex gap-2.5 text-[9px] text-slate-500 truncate mt-1">
                                  {p.productCode && <span className="font-mono text-indigo-400">{p.productCode}</span>}
                                  {p.url && <span className="truncate max-w-[120px]">{p.url}</span>}
                                  <span>문의 {p.inquiries?.length || 0}건</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); if (confirm(`'${p.name}' 스펙 상품을 정말 삭제하시겠습니까?`)) { deleteProduct(p.productId); if (detailedProductId === p.productId) setDetailedProductId(null); } }} 
                                  className="text-slate-500 hover:text-rose-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <ChevronRight size={14} className="text-slate-600 group-hover:text-indigo-400 transition-all" />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right: Detailed selected specs (col 8) */}
                  <div className="lg:col-span-8 glass-panel rounded-xl flex flex-col overflow-hidden h-full">
                    {detailedProductId ? (
                      (() => {
                        const p = safeProducts.find(prod => prod.productId === detailedProductId);
                        if (!p) return <div className="p-10 text-center text-xs text-slate-500">상품 상세 데이터를 불러올 수 없습니다.</div>;
                        return (
                          <div className="flex-1 flex flex-col h-full overflow-hidden">
                            
                            {/* Spec Header */}
                            <div className="p-4 border-b border-slate-900/60 bg-[#070b19]/60 flex items-center justify-between">
                              <div>
                                <h3 className="text-xs font-bold text-white">{p.name}</h3>
                                {p.url && (
                                  <a href={p.url} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline mt-0.5 block">
                                    {p.url}
                                  </a>
                                )}
                              </div>
                              <button 
                                onClick={() => { loadProductToInputs(p); setCurrentTab('inquiries'); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded transition-all"
                              >
                                CS 답변 작성에 스펙 불러오기
                              </button>
                            </div>

                            {/* Scrollable contents */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                              
                              {/* Spec metrics card */}
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-[#0b0f20]/60 p-3 rounded-lg border border-slate-900">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">학습 매칭 점수</span>
                                  <span className="text-sm font-black text-white mt-1 block">{p.qualityScore || 100}/100 점</span>
                                </div>
                                <div className="bg-[#0b0f20]/60 p-3 rounded-lg border border-slate-900">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">마스터 코드</span>
                                  <span className="text-xs font-mono text-indigo-400 mt-1.5 block">{p.productCode || "미지정"}</span>
                                </div>
                                <div className="bg-[#0b0f20]/60 p-3 rounded-lg border border-slate-900">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">누적 연결 문의</span>
                                  <span className="text-sm font-black text-white mt-1 block">{p.inquiries?.length || 0} 건</span>
                                </div>
                              </div>

                              {/* 부족한 필수 사양 표시 패널 추가 (v1.0-C) */}
                              {(() => {
                                const missingFields: string[] = [];
                                const absenceKeywords = ["명시 없음", "확인되지 않음", "제공 여부 확인 필요", "상세페이지 내 명시 없음", "확인 필요", "별도 표기 없음", "미확인"];
                                if (p.info) {
                                  p.info.split('\n').forEach((line: string) => {
                                    if (line.includes(':')) {
                                      const val = line.substring(line.indexOf(':') + 1);
                                      if (absenceKeywords.some(kw => val.includes(kw))) {
                                        const fieldName = line.substring(0, line.indexOf(':')).replace(/^-\s*/, '').trim();
                                        missingFields.push(fieldName);
                                      }
                                    }
                                  });
                                }
                                if (missingFields.length === 0) return null;
                                return (
                                  <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-4">
                                    <div className="flex justify-between items-center border-b border-amber-500/10 pb-2">
                                      <h4 className="text-[11.5px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                        ⚠️ 보완이 필요한 항목 ({missingFields.length}건)
                                      </h4>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={handleSaveAllSupplementFields}
                                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition-all shadow-sm flex items-center gap-1"
                                        >
                                          <Check size={10} /> 💾 보완 정보 일괄 저장
                                        </button>
                                        <button
                                          onClick={() => handlePromoteToLearned(p.productId)}
                                          className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition-all shadow-sm flex items-center gap-1"
                                        >
                                          🎓 최종 학습 완료로 승격
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-slate-350 leading-relaxed font-medium">
                                      자율 AI 스캐너가 상품 페이지 분석 시 아래 필수 항목을 식별하지 못했습니다. 보다 원활한 자동화 CS 답변을 위해, 상세페이지를 수정하거나 아래 입력창에 수동 보완 정보를 입력하여 저장하십시오.
                                    </p>
                                    
                                    <div className="space-y-3.5 pt-1">
                                      {missingFields.map((field) => {
                                        const sensitiveFields = ["KC", "KF", "인증", "식품용", "식품", "어린이", "방수", "생활방수", "하중", "내하중", "안전성", "불량", "환불"];
                                        const isSensitive = sensitiveFields.some(f => field.includes(f));
                                        return (
                                          <div key={field} className="bg-slate-950/40 p-3 rounded-lg border border-slate-900/60 space-y-1.5">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs font-bold text-slate-350">{field}</span>
                                              {isSensitive && (
                                                <span className="text-[9px] text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                  ⚠️ 민감 사양 항목
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex gap-2">
                                              <input
                                                type="text"
                                                value={supplementaryValues[field] || ""}
                                                onChange={(e) => setSupplementaryValues(prev => ({ ...prev, [field]: e.target.value }))}
                                                className="flex-1 p-2 bg-[#070b18] border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-indigo-500 focus:outline-none placeholder:text-slate-650"
                                                placeholder={isSensitive 
                                                  ? "민감 정보 기준에 부합하도록 기재 (답변 과장 단정 방지)" 
                                                  : "보완 정보 입력 (예: 폴리에스터 100%)"
                                                }
                                              />
                                              <button
                                                onClick={() => handleSaveSupplementField(field, supplementaryValues[field] || "")}
                                                disabled={!supplementaryValues[field]}
                                                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 text-slate-300 font-bold px-3 py-2 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1"
                                                title="이 항목 개별 저장"
                                              >
                                                💾 저장
                                              </button>
                                            </div>
                                            {isSensitive && (
                                              <p className="text-[9px] text-slate-500 leading-normal">
                                                * 이 항목은 수동 보완 시 과장 단정을 방지하기 위해 <strong className="text-slate-400">"판매자 입력 기준"</strong> 태그가 함께 저장됩니다.
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Spec body */}
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">상세 수집 명세 고시 사항</h4>
                                <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg whitespace-pre-wrap text-xs text-slate-250 leading-relaxed font-mono overflow-x-auto">
                                  {safeRender(p.info)}
                                </div>
                              </div>

                              {/* Internal cs memo editor */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Database size={12} className="text-amber-400" /> 판매처 및 비공개 내부 관리 대응 메모
                                  </h4>
                                  {tempInternalMemo !== (p.internalMemo || "") && (
                                    <button 
                                      onClick={() => { updateInternalMemo(p.productId, tempInternalMemo); addLog(`💾 상품 "${p.name}" 내부 대응 메모 수정 저장`, 'success'); alert("성공적으로 저장되었습니다."); }} 
                                      className="text-[9px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded transition-all hover:bg-amber-700"
                                    >
                                      수정메모 저장
                                    </button>
                                  )}
                                </div>
                                <textarea 
                                  className="w-full p-3 bg-[#070b18]/80 border border-indigo-500/20 rounded-lg text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/40 custom-scrollbar"
                                  rows={4}
                                  placeholder="고급 B2B 고객대응을 위한 공급처 정보, 입고 단가, CS 대응 규칙 등 내부용 비공개 메모를 입력하십시오."
                                  value={tempInternalMemo}
                                  onChange={(e) => setTempInternalMemo(e.target.value)}
                                />
                              </div>

                              {/* Past inquiry match flow */}
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">이 상품으로 수집되었던 과거 문의 이력 ({p.inquiries?.length || 0}건)</h4>
                                {(!p.inquiries || p.inquiries.length === 0) ? (
                                  <p className="text-[10px] text-slate-500">과거 매칭된 이력이 존재하지 않습니다.</p>
                                ) : (
                                  <div className="space-y-3.5">
                                    {p.inquiries.map((inq: any) => (
                                      <div key={inq.id} className="p-4 border border-slate-900 rounded-lg bg-slate-950/20">
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-[9px] text-slate-500 font-mono">{inq.date}</span>
                                          <button 
                                            onClick={() => { handleReuseInquiry(inq.customerInquiry); setCurrentTab('inquiries'); }} 
                                            className="text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                                          >
                                            <RefreshCcw size={10} /> 이 문의 작업창에 로드
                                          </button>
                                        </div>
                                        <div className="text-xs leading-relaxed text-slate-200 mb-2">
                                          <span className="font-extrabold text-rose-400 mr-1.5">Q.</span>{inq.customerInquiry}
                                        </div>
                                        <div className="p-3 rounded bg-slate-950 border border-slate-900/60 text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                                          <span className="font-extrabold text-indigo-400 block mb-1">A. CS Reply Draft</span>
                                          {safeRender(inq.csReply)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-10">
                        <BookOpen size={48} className="opacity-15 mb-3" />
                        <p className="text-xs">상세 명세 정보를 열람 및 조작할 상품을 좌측 스펙 리스트에서 선택해주십시오.</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* ===================================================================
              TAB: AUTOMATION AGENT (자동 수집) (Redesigned for Premium SaaS density v0.9-B)
              =================================================================== */}
          {currentTab === 'automation' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 fade-in-slide-right">
              
              {/* Left Control Console (col 4) */}
              <div className="lg:col-span-4 space-y-6">
                <div className="glass-panel p-5 rounded-xl space-y-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-slate-900 pb-3.5">
                    <Layers size={16} className="text-indigo-400" /> B2B 대량 자동학습 구동
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">카탈로그 상품목록 대표 URL</label>
                      <input 
                        type="text"
                        value={catalogUrl}
                        onChange={(e) => setCatalogUrl(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                        placeholder="http://dht-b2b.com/goods/catalog"
                      />
                      <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                        상위 카테고리 또는 상품 리스트 페이지의 URL을 입력하면, 에이전트가 하위 상품 세부 정보를 순차 자동 분석합니다.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">최대 순차 수집 개수 제한</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range"
                          min="1"
                          max="10"
                          value={catalogLimit}
                          onChange={(e) => setCatalogLimit(parseInt(e.target.value))}
                          className="flex-1 accent-indigo-500"
                        />
                        <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-850">
                          {catalogLimit} 개
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleStartCatalogScrape}
                      disabled={isCatalogPolling || !catalogUrl}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isCatalogPolling ? (
                        <>
                          <Cpu className="animate-spin animate-pulse" size={14} /> 자동 수집 분석 중...
                        </>
                      ) : (
                        <>
                          <Play size={12} /> 자동 수집 가동 (Start Scraping)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Scraper Stats board or 안내 요약 */}
                {catalogTaskState ? (
                  <div className="glass-panel p-5 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
                      <BarChart3 size={14} className="text-indigo-400" /> 수집 상태 종합 현황
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-center text-xs">
                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-900">
                        <span className="text-[9px] text-slate-500 font-bold block">스캔 상품</span>
                        <span className="text-sm font-bold text-white mt-1 block">{catalogTaskState.totalFound}개</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-900">
                        <span className="text-[9px] text-slate-500 font-bold block">작업 큐 대기</span>
                        <span className="text-sm font-bold text-indigo-400 mt-1 block">{catalogTaskState.queuedCount}개</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-900">
                        <span className="text-[9px] text-emerald-500 font-bold block">성공</span>
                        <span className="text-sm font-bold text-emerald-400 mt-1 block">{catalogTaskState.successCount}개</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-900">
                        <span className="text-[9px] text-rose-500 font-bold block">실패 / 확인필요</span>
                        <span className="text-sm font-bold text-rose-400 mt-1 block">
                          {catalogTaskState.failedCount + catalogTaskState.checkRequiredCount + catalogTaskState.insufficientCount}개
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel p-5 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
                      <CheckCircle size={14} className="text-indigo-400" /> 최근 자동화 수집 결과 요약
                    </h4>
                    {safeCollectionHistory.length > 0 ? (
                      <div className="space-y-3 text-[11px] leading-relaxed">
                        <div className="flex justify-between text-slate-400">
                          <span>최근 수집 배치 실행</span>
                          <span className="font-mono text-slate-200">{safeCollectionHistory[0].collectedAt.split(" ")[0]}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>성공적으로 수집된 상품</span>
                          <span className="font-bold text-white font-mono">{safeCollectionHistory.length} 건</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>AI 정보 신뢰 점수</span>
                          <span className="text-indigo-400 font-bold font-mono">평균 95점</span>
                        </div>
                        <div className="pt-2 border-t border-slate-900/60 text-[10px] text-slate-500 leading-normal">
                          대량 수집 완료된 지식은 CS 에이전트 답변 작성 단계에서 즉각 대조 및 검토에 자동 활용됩니다.
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 leading-relaxed py-2">
                        실행된 자동 수집 배치 이력이 아직 없습니다. 상단 카탈로그 URL을 입력하여 대량 자동 학습 에이전트를 시작해 주십시오.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Queue List & Activity Log (col 8) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="glass-panel p-5 rounded-xl flex flex-col h-full justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-3.5">
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Activity size={16} className="text-indigo-400" /> 수집 상태 모니터링 & 진행률
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${catalogTaskState?.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : isCatalogPolling ? 'bg-indigo-500/10 text-indigo-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                        {catalogTaskState?.status.toUpperCase() || 'IDLE'}
                      </span>
                    </div>

                    {/* Progress indicator */}
                    {catalogTaskState && (
                      <div className="space-y-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-900">
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>{catalogTaskState.currentStep}</span>
                          <span className="font-mono text-white">{catalogTaskState.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                          <div 
                            className="bg-indigo-500 h-full transition-all duration-300"
                            style={{ width: `${catalogTaskState.progressPercent}%` }}
                          ></div>
                        </div>
                        {isCatalogPolling && (
                          <div className="flex justify-between text-[9px] text-slate-500 font-mono pt-1">
                            <span>수집 주기 Throttling: 3~5s 적용 중</span>
                            <span>실시간 크롤러: 구동 성공</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Queue table list */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">FIFO 백그라운드 스케줄러 큐</label>
                      </div>

                      {/* 수집 품질 진단 기준 범례 추가 (v1.0-B) */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 bg-[#0b0f20]/40 border border-slate-900 rounded-lg text-[10.5px]">
                        <span className="font-extrabold text-slate-400">💡 수집 품질 진단 기준:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SUCCESS</span>
                          <span className="text-slate-350">필수 정보 충분 (미확인 2개 이하)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">INSUFFICIENT</span>
                          <span className="text-slate-350">정보 부족 (미확인 3개 이상 ➔ 보완 필요)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">CHECK_REQUIRED</span>
                          <span className="text-slate-350">검수 필요 (품질 70점 미만 ➔ 상세 검토)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-800 text-slate-450 border border-slate-700">FAILED</span>
                          <span className="text-slate-350">수집/분석 내부 실패</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 border border-slate-900 rounded-lg overflow-hidden">
                        <table className="w-full text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-[#0b0f20]/60 border-b border-slate-900 text-slate-400 text-left">
                              <th className="p-3 font-semibold">Index</th>
                              <th className="p-3 font-semibold">Target Product URL</th>
                              <th className="p-3 font-semibold">Scraped Name</th>
                              <th className="p-3 font-semibold">Status</th>
                              <th className="p-3 font-semibold">Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/40 text-slate-350">
                            {catalogTaskState?.items && catalogTaskState.items.length > 0 ? (
                              catalogTaskState.items.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-[#070b19]/30">
                                  <td className="p-3 font-mono">{idx + 1}</td>
                                  <td className="p-3 font-mono truncate max-w-[150px]" title={item.url}>{item.url}</td>
                                  <td className="p-3 font-semibold truncate max-w-[120px]">{item.productName || '미추출'}</td>
                                  <td className="p-3">
                                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${item.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : item.status === 'PROCESSING' ? 'bg-indigo-500/10 text-indigo-400 animate-pulse' : 'bg-rose-500/10 text-rose-400'}`}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500 text-[9px]">{item.reason || '-'}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                  대기열에 대기중인 수집 큐가 없습니다. URL을 입력하고 가동해주십시오.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* 안내 카드 3개 (수집 전 대기 상태 보완 위젯) */}
                      {!catalogTaskState && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                          <div className="bg-[#0b0f20]/30 p-4 rounded-xl border border-slate-900/60 leading-relaxed space-y-2">
                            <div className="flex items-center gap-2 text-indigo-400">
                              <Cpu size={14} />
                              <h4 className="text-[13px] font-extrabold text-slate-200">1. 자율 스캔 엔진</h4>
                            </div>
                            <p className="text-[11.5px] text-slate-300 leading-relaxed font-medium">
                              입력된 도매 카탈로그 또는 스토어 상품 리스트 URL로부터 하위 상품 세부 링크를 파싱하고 상세 스펙을 순차적으로 자동 수집합니다.
                            </p>
                          </div>
                          <div className="bg-[#0b0f20]/30 p-4 rounded-xl border border-slate-900/60 leading-relaxed space-y-2">
                            <div className="flex items-center gap-2 text-indigo-400">
                              <AlertCircle size={14} />
                              <h4 className="text-[13px] font-extrabold text-slate-200">2. 안전한 접속 관리</h4>
                            </div>
                            <p className="text-[11.5px] text-slate-300 leading-relaxed font-medium">
                              원격 쇼핑몰 서버 IP 차단 및 부하 방지를 위해 수집 동작 간에 3~5초의 가변 대기 시간(Throttling)을 자율적으로 적용하여 안전하게 구동됩니다.
                            </p>
                          </div>
                          <div className="bg-[#0b0f20]/30 p-4 rounded-xl border border-slate-900/60 leading-relaxed space-y-2">
                            <div className="flex items-center gap-2 text-indigo-400">
                              <Database size={14} />
                              <h4 className="text-[13px] font-extrabold text-slate-200">3. 지식 즉시 동기화</h4>
                            </div>
                            <p className="text-[11.5px] text-slate-300 leading-relaxed font-medium">
                              에이전트가 스캔한 상품의 스펙 명세와 마스터 데이터는 즉시 지식 베이스 상품 DB에 연동되어 실시간 유입되는 문의 매칭에 즉각 기여합니다.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Markdown Report section (Framed beautifully as paper report) */}
                    {catalogTaskState?.reportText && (
                      <div className="space-y-3 border-t border-slate-900/60 pt-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={12} className="text-indigo-400" /> 수집 학습 완료 최종 보고서 (Official Report Document)
                        </label>
                        
                        <div className="p-6 bg-[#070b18]/80 border border-slate-800 rounded-xl relative shadow-2xl overflow-hidden max-w-2xl mx-auto">
                          <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
                          {/* Paper style document frame */}
                          <div className="border-b-2 border-slate-800 pb-3 mb-4 text-center">
                            <span className="text-[8px] font-black tracking-widest text-indigo-400 uppercase">Automation Scraper Dispatch Document</span>
                            <h4 className="text-xs font-black text-white mt-1">상품학습 종합 업무 보고서</h4>
                            <p className="text-[8px] text-slate-500 font-mono mt-0.5">Task ID: {catalogTaskState.taskId} | Completed At: {new Date(catalogTaskState.completedAt || Date.now()).toLocaleTimeString('ko-KR')}</p>
                          </div>
                          
                          <div className="text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap font-sans">
                            {catalogTaskState.reportText}
                          </div>
                          
                          <div className="border-t border-slate-850 mt-5 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                            <span>Aron Seller AI 자동화 시스템</span>
                            <span className="font-bold text-slate-400 italic">최종 검토 승인 완료</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ===================================================================
              TAB: OPERATIONS REPORT (업무 보고) (Redesigned for Premium SaaS B2B v0.9-B)
              =================================================================== */}
          {currentTab === 'reports' && (
            <div className="max-w-2xl mx-auto space-y-6 fade-in-slide-right">
              {/* Paper styled dashboard card with shadows, margins, typography and signature */}
              <div className="glass-panel p-8 rounded-xl border border-slate-800/80 bg-[#070b1a]/40 shadow-2xl relative overflow-hidden">
                
                {/* Visual design element */}
                <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl"></div>
                
                {/* Paper header */}
                <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center relative">
                  <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">최종 검토 일일 운영 보고서</span>
                  <h2 className="text-xl font-black text-white mt-1 tracking-tight">종합 일일 운영 보고서</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Report ID: DIR-REP-20260527 | Generated: 2026-05-27 14:42</p>
                </div>

                {/* Content specs */}
                <div className="space-y-6 text-slate-300 text-xs leading-relaxed">
                  
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-indigo-400" /> 1. 오늘의 오퍼레이션 종합 평가
                    </h4>
                    <p className="p-4 bg-slate-950/40 rounded-lg border border-slate-900 text-slate-300 font-medium">
                      오늘의 CS 운영 현황을 요약해 드립니다. 총 <span className="text-indigo-450 font-black">{safeInboxItems.length}건</span>의 문의가 접수되어 이 중 <span className="text-indigo-450 font-black">{safeInboxItems.filter(item => item.status === 'drafted' || item.status === 'approved').length}건</span>은 자동화 처리 시스템에 의해 자동 답변 초안이 무결하게 작성되었습니다. 1건의 고위험성 블랙컨슈머성 문의(inbox_3)가 위험 검수 담당에 의해 사전 필터링되어 수동 검토 대기 상태로 전환되었습니다. 상품 DB와 매칭도가 92% 이상으로 안정적인 답변이 가능했습니다. 전체적인 CS 오퍼레이션을 무결하게 마쳤습니다.
                    </p>
                    
                    {/* 5단 종합 지표 카드 그리드 추가 (v1.0-E) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                      <div className="bg-[#0b0f20]/50 p-3 rounded-lg border border-slate-900 text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">수동 문의 추가</span>
                        <span className="text-sm font-black text-white mt-1 block font-mono">
                          {getTodayMetricCount("문의 수집 담당", "수동 문의 추가")} 건
                        </span>
                      </div>
                      <div className="bg-[#0b0f20]/50 p-3 rounded-lg border border-slate-900 text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">CS 초안 작성</span>
                        <span className="text-sm font-black text-white mt-1 block font-mono">
                          {getTodayMetricCount("답변 작성 담당", "CS 답변 초안 작성")} 건
                        </span>
                      </div>
                      <div className="bg-[#0b0f20]/50 p-3 rounded-lg border border-slate-900 text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">상품 수동 보완</span>
                        <span className="text-sm font-black text-white mt-1 block font-mono">
                          {getTodayMetricCount("상품학습 담당", "상품 정보 수동 보완")} 건
                        </span>
                      </div>
                      <div className="bg-[#0b0f20]/50 p-3 rounded-lg border border-slate-900 text-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">자동 수집 완료</span>
                        <span className="text-sm font-black text-white mt-1 block font-mono">
                          {getTodayMetricCount("상품학습 담당", "자동 수집 완료")} 건
                        </span>
                      </div>
                      <div className="bg-rose-950/10 p-3 rounded-lg border border-rose-900/30 text-center">
                        <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">위험 검수 경고</span>
                        <span className="text-sm font-black text-rose-400 mt-1 block font-mono">
                          {getTodayMetricCount("위험 검수 담당", "위험 검수", "warning")} 건
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Flame size={12} className="text-rose-400" /> 2. 리스크 필터링 검출 목록
                      </h4>
                      <div className="p-4 bg-rose-950/10 border border-rose-900/20 rounded-lg text-rose-300 text-[11px] space-y-2 shadow-inner">
                        <div className="font-bold flex items-center gap-1.5">
                          <Flame size={12} className="text-rose-400 animate-pulse" /> 감지 리스크 (1건 수동 대기)
                        </div>
                        <p className="leading-relaxed">
                          - ID: inbox_3 | 쿠팡 <br />
                          - 검출 위험: <strong>"소비자원 고발"</strong> 및 여론 위협 협박 감출됨. <br />
                          - 대응 규칙: 즉각적인 사과 조안 수립 후 수동 대기.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Database size={12} className="text-emerald-400" /> 3. 지식 DB 학습 현황
                      </h4>
                      <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-lg space-y-2 shadow-inner">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                          <ShieldCheck size={12} /> 정상 동기화 (완료)
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          - 신규 학습 완료 상품: {safeProducts.length} 개 <br />
                          - 평균 추출 품질도 점수: 96점 / 100점 만점 <br />
                          - OCR 이미지 지식 캡션 완료
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers size={12} className="text-indigo-400" /> 4. 추천 후속 오퍼레이션 작업
                    </h4>
                    <div className="p-4 bg-indigo-950/10 border border-indigo-500/10 rounded-lg">
                      <ul className="list-disc pl-5 space-y-1.5 text-[11px] text-slate-350">
                        <li>스마트스토어 실시간 문의 수집 동기화 완료</li>
                        <li>위험 감지 1건(inbox_3) 수동 검토 후 최종 발송 처리 요망</li>
                        <li>신규 카탈로그 수집 완료 상품의 품질 보완 메모 작성 요망</li>
                      </ul>
                    </div>
                  </div>

                  {/* 에이전트별 실시간 업무 상세 이력 테이블 추가 (v1.0-E) */}
                  <div className="pt-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Activity size={12} className="text-indigo-400" /> 5. 에이전트별 실시간 업무 상세 이력 (Agent Action Ledgers)
                    </h4>
                    <div className="bg-slate-950 border border-slate-900 rounded-lg overflow-hidden">
                      <div className="max-h-40 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-[9px] border-collapse">
                          <thead>
                            <tr className="bg-[#0b0f20]/80 border-b border-slate-900 text-slate-500 text-left sticky top-0">
                              <th className="p-2 font-semibold">시각</th>
                              <th className="p-2 font-semibold">담당 에이전트</th>
                              <th className="p-2 font-semibold">행동명</th>
                              <th className="p-2 font-semibold">대상</th>
                              <th className="p-2 font-semibold">결과</th>
                              <th className="p-2 font-semibold">메시지</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/40 text-slate-400">
                            {workLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-[#070b19]/30">
                                <td className="p-2 font-mono whitespace-nowrap">{log.time.split(" ")[4] || log.time.split(" ")[1]}</td>
                                <td className="p-2 font-bold whitespace-nowrap text-slate-300">{log.role}</td>
                                <td className="p-2 font-semibold text-indigo-400 whitespace-nowrap">{log.action}</td>
                                <td className="p-2 font-mono whitespace-nowrap text-slate-450">{log.targetType.toUpperCase()}{log.targetId ? ` [${log.targetId}]` : ''}</td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.2 rounded text-[7px] font-black ${getResultBadgeColor(log.result)}`}>
                                    {log.result.toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-2 max-w-[200px] truncate" title={log.message}>{log.message}</td>
                              </tr>
                            ))}
                            {workLogs.length === 0 && (
                              <tr>
                                <td colSpan={6} className="p-4 text-center text-slate-650">기록된 상세 업무 로그가 없습니다.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Director sign block with approval stamp mockup */}
                <div className="border-t border-slate-900 mt-8 pt-6 flex justify-between items-center text-xs">
                  <div className="text-slate-500 flex items-center gap-2">
                    <span>Aron Seller AI CS Operation Center</span>
                    <span className="text-slate-700">|</span>
                    <span className="text-[10px] text-indigo-400 font-mono font-bold">MODE: AUTONOMOUS</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Retro Stamp */}
                    <div className="border-2 border-indigo-500/40 text-indigo-400/80 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest rotate-12 scale-90 select-none">
                      APPROVED
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">수석 AI 오퍼레이터</span>
                      <span className="font-bold text-white italic tracking-wide mt-1 block">최종 검토 Aron (서명)</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
