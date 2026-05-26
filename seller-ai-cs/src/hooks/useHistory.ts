import { useState, useEffect } from 'react';

export interface HistoryItem {
  id: string;
  date: string;
  productInfo: string;
  customerInquiry: string;
  sellerMemo: string;
  result: {
    csReply: string;
    summary: string;
    risks: string;
    sellerNotes: string;
  };
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('seller-ai-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('History parsing failed', e);
      }
    }
  }, []);

  const addHistory = (item: Omit<HistoryItem, 'id' | 'date'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(),
      date: new Date().toLocaleString('ko-KR'),
    };
    
    const newHistory = [newItem, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('seller-ai-history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('seller-ai-history');
  };

  return { history, addHistory, clearHistory };
}
