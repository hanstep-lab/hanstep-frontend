// 등록증 OCR 결과 기다리기. OCR 은 비동기라 GET /documents/{id} 를 일정 간격으로 다시 부른다(polling).
// 화면은 phase 만 보고 로딩·결과·실패를 그리면 된다.
//   waiting : 업로드됨, OCR 처리 중 (UPLOADED)
//   ready   : OCR 결과 도착 (PENDING_CONFIRMATION) 또는 이미 확정(CONFIRMED)
//   failed  : OCR 실패 (FAILED) 또는 조회 오류
//   timeout : 너무 오래 걸림. retry 로 다시 기다리기

import { useCallback, useEffect, useState } from 'react';
import { getDocument, retryOcr } from '../api/document';
import type { DocumentResponse } from '../types/api';
import { errorText } from '../utils/errorText';
import { ocrTimeMark } from '../utils/ocrTiming';

const INTERVAL_MS = 1000;
// 1초 × 60 = 약 1분. 11/23 운영 기준선: 업로드 → 결과까지 중앙값 약 3.8초, 최대 약 7.7초
const MAX_TRIES = 60;

type Phase = 'waiting' | 'ready' | 'failed' | 'timeout';

export function useIdDocument(documentId: number | null) {
  const [doc, setDoc] = useState<DocumentResponse | null>(null);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0); // retry 할 때마다 1 씩 올려 polling 을 새로 시작

  useEffect(() => {
    if (documentId == null) return;

    let cancelled = false; // 화면을 떠나면 true → 이후 응답은 무시
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    let retried = false;
    let lastState = ''; // 시간 로그: 서버 상태가 바뀔 때만 찍는다

    setPhase('waiting');
    setError(null);

    const poll = async () => {
      tries += 1;
      try {
        const reqAt = Date.now();
        let res = await getDocument(documentId);
        const reqMs = Date.now() - reqAt;

        // 작업이 큐에 못 들어간 채 남아 있으면 한 번 다시 보내 본다(서버도 1분마다 자동 재시도)
        if (res.status === 'UPLOADED' && res.ocrJob?.retryable && !retried) {
          retried = true;
          ocrTimeMark('OCR 재요청 (큐 미등록)');
          res = await retryOcr(documentId).catch(() => res);
        }
        if (cancelled) return;
        setDoc(res);

        const state = `${res.status}/${res.ocrJob?.status ?? '-'}`;
        if (state !== lastState) {
          ocrTimeMark(`조회 ${tries}회째 상태 ${state} (요청 ${reqMs}ms)`);
          lastState = state;
        }

        if (res.status === 'PENDING_CONFIRMATION' || res.status === 'CONFIRMED') {
          ocrTimeMark('결과 표시');
          setPhase('ready');
          return;
        }
        if (res.status === 'FAILED') {
          ocrTimeMark(`실패 ${res.failureCode ?? res.ocrJob?.errorCode ?? ''}`);
          setPhase('failed');
          return;
        }
      } catch (e) {
        if (cancelled) return;
        ocrTimeMark('조회 오류');
        setError(errorText(e, '등록증 정보를 불러오지 못했어요.'));
        setPhase('failed');
        return;
      }

      if (tries >= MAX_TRIES) {
        ocrTimeMark(`시간 초과 (조회 ${tries}회)`);
        setPhase('timeout');
        return;
      }
      timer = setTimeout(poll, INTERVAL_MS);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [documentId, round]);

  const retry = useCallback(() => setRound((r) => r + 1), []);

  return { doc, setDoc, phase, error, retry };
}
