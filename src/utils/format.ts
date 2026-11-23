// 표시 형식만 바꾸는 함수 모음. 값을 계산하지 않는다.
import i18n from '../i18n';

const MAN = 10_000;
const EOK = 100_000_000;

// 1억 미만 금액 표시: 30만 원 / 15,000원
function fmtUnderEok(n: number): string {
  if (n >= MAN && n % MAN === 0) return `${fmtNumber(n / MAN)}만 원`;
  return `${fmtNumber(n)}원`;
}

// 원 단위 금액 표시: 1억 원 / 1억 5,000만 원 / 30만 원 / 15,000원
export function fmtWon(n: number): string {
  // 영어 화면은 만·억 단위 없이 ₩300,000 (한국어 화면은 아래 그대로)
  if (i18n.language !== 'ko') return n < 0 ? `-₩${fmtNumber(-n)}` : `₩${fmtNumber(n)}`;
  if (n < EOK) return fmtUnderEok(n);
  const eok = Math.floor(n / EOK);
  const rest = n % EOK;
  return rest === 0 ? `${fmtNumber(eok)}억 원` : `${fmtNumber(eok)}억 ${fmtUnderEok(rest)}`;
}

// 1234567 → "1,234,567", 1382.5 → "1,382.5" (소수 자리는 받은 그대로 둔다)
export function fmtNumber(n: number): string {
  const [int, dec] = String(n).split('.');
  const withComma = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${withComma}.${dec}` : withComma;
}

// 환율 표시용. 24.9 → "24.90", 1382.5 → "1,382.50". 반올림이 아니라 소수 둘째 자리 모양만 맞춘다.
// sign 을 주면 양수 앞에 + 를 붙인다 (전일 대비 등).
// digits 를 주면 그 자리까지 0을 채운다 (PHP 3자리: 21.1 → "21.100"). 기본 2자리. 자르거나 반올림하지 않는다.
export function fmtRate(n: number, opts?: { sign?: boolean; digits?: number }): string {
  const [int, dec = ''] = String(Math.abs(n)).split('.');
  const body = `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec.padEnd(opts?.digits ?? 2, '0')}`;
  if (n < 0) return `-${body}`;
  return opts?.sign && n > 0 ? `+${body}` : body;
}

// 퍼센트는 서버 값 그대로, 부호만 붙인다. 0.23 → "+0.23%", -0.36 → "-0.36%"
export function fmtPercent(n: number): string {
  return `${n > 0 ? '+' : ''}${n}%`;
}

// 서버 날짜 "2026-11-13" → "2026.11.13" (short 면 "11.13")
export function fmtDate(iso: string, opts?: { short?: boolean }): string {
  const [y, m, d] = iso.split('-');
  return opts?.short ? `${m}.${d}` : `${y}.${m}.${d}`;
}
