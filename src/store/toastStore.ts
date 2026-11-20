// 화면 아래 잠깐 뜨는 안내(토스트) 상태(zustand). 화면을 옮겨도 보이도록 루트 레이아웃의 ToastHost 하나가 그린다.
// 어디서든 showToast('초기화했어요') 로 띄운다. id 는 같은 문구를 연달아 띄울 때도 타이머를 다시 걸기 위한 값.

import { create } from 'zustand';

type ToastState = {
  message: string | null;
  id: number;
};

export const useToastStore = create<ToastState>(() => ({ message: null, id: 0 }));

export function showToast(message: string) {
  useToastStore.setState((s) => ({ message, id: s.id + 1 }));
}

export function hideToast() {
  useToastStore.setState({ message: null });
}
