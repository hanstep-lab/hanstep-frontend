import { create } from 'zustand';
import type { TransferResult } from '../types/api';

type TransferState = {
  initialAmountKRW: number | null; // null = 금액 미정 (메뉴·AI-004에서 넘어올 때)
  result: TransferResult | null;   // 송금 완료 화면에 보여줄 서버 결과
  setInitialAmount: (v: number | null) => void;
  setResult: (v: TransferResult) => void;
  reset: () => void;
};

export const useTransferStore = create<TransferState>((set) => ({
  initialAmountKRW: null,
  result: null,
  setInitialAmount: (v) => set({ initialAmountKRW: v }),
  setResult: (v) => set({ result: v }),
  reset: () => set({ initialAmountKRW: null, result: null }),
}));
