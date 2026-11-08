import { create } from 'zustand';

type TransferState = {
  initialAmountKRW: number | null; // null = 금액 미정 (AI-004에서 넘어올 때)
  confirmedAmountKRW: number;
  setInitialAmount: (v: number | null) => void;
  setConfirmedAmount: (v: number) => void;
  reset: () => void;
};

export const useTransferStore = create<TransferState>((set) => ({
  initialAmountKRW: null,
  confirmedAmountKRW: 0,
  setInitialAmount: (v) => set({ initialAmountKRW: v }),
  setConfirmedAmount: (v) => set({ confirmedAmountKRW: v }),
  reset: () => set({ initialAmountKRW: null, confirmedAmountKRW: 0 }),
}));
