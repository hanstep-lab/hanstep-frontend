# hanstep-frontend

신한커리어넥스트 2회차 프로젝트 | 국내 거주 외국인의 금융생활 및 체류자격 성장을 지원하는 AI 플랫폼 '신한걸음'의 프론트엔드 레포지토리입니다.

신한 SOL Global 안에서 여는 앱인앱 서비스를 가정한 모바일 앱입니다. 앱을 켜면 SOL Global 홈을 재현한 화면이 나오고, 상단 AI 버튼(쏠)을 누르면 신한걸음으로 들어갑니다.

| 레포지토리 | 역할 |
| --- | --- |
| **hanstep-frontend** | 모바일 앱 (Expo / React Native) |
| [hanstep-backend](https://github.com/hanstep-lab/hanstep-backend) | API 서버 (Spring Boot), 로컬 인프라, 운영 배포 |
| [hanstep-AI](https://github.com/hanstep-lab/hanstep-AI) | AI 서버 (FastAPI), 챗봇, 계산 엔진, OCR |

서비스 소개, 전체 아키텍처, 팀 소개는 [조직 프로필](https://github.com/hanstep-lab)에 있습니다.

<p align="center">
  <img src="docs/screenshots/sol-home.png" width="190" alt="SOL Global 홈">
  <img src="docs/screenshots/chat-home.png" width="190" alt="AI 채팅">
  <img src="docs/screenshots/visa-roadmap.png" width="190" alt="체류자격 전환 로드맵">
  <img src="docs/screenshots/credit.png" width="190" alt="대안신용 사전진단">
</p>

## 사용 시나리오

한국에서 4년째 일하는 Mark(E-9 비전문취업)의 질문 네 가지가 화면으로 이어집니다.

| 장면 | Mark의 질문 | 이어지는 화면 |
| --- | --- | --- |
| 1. 송금 | "어머니께 70만 원 보내 줘" | 채팅의 송금 확인 카드 → 해외송금 (TR-001) |
| 2. 저축 | "송금하고 남은 돈은 어떻게 모으면 좋을까요?" | 채팅의 상품 추천 카드 → 금융상품 추천 (FP-001) |
| 3. 대출 | "신용 이력이 없다는데 대출받을 수 있을까요?" | 채팅의 사전진단 버튼 → 대안신용 사전진단 (CR-001) |
| 4. 정착 | "어떤 비자를 준비하면 될까요?" | 채팅의 E-7-4 점수 카드 → 체류자격 전환 로드맵 (VS-001) |

## 주요 화면

### 진입과 온보딩

SOL Global 홈의 AI 버튼으로 들어와 언어 선택 → 외국인등록증 촬영·확인 → 마이데이터 동의 → 목표 선택 → 목표별 질문 → 최종 확인 순서로 진행합니다.

| SOL Global 홈 | 언어 선택 | 등록증 촬영 | 등록증 확인 |
| :---: | :---: | :---: | :---: |
| <img width="180" alt="SOL Global 홈" src="https://github.com/user-attachments/assets/85e1cd38-6f00-41c4-83be-caa9e477c416" /> | <img width="180" alt="언어 선택" src="https://github.com/user-attachments/assets/b41fd850-02e5-4a03-8a68-afba852c05ea" /> | <img width="180" alt="등록증 촬영" src="https://github.com/user-attachments/assets/c6ce5577-7fc5-400e-947c-544279a93311" /> | <img width="180" alt="등록증 확인" src="https://github.com/user-attachments/assets/5837946f-cabb-47c7-aa41-9a7b9201ad97" /> |
| SG-000 · `/` | ON-001 · `/onboarding/language` | ON-002 · `/onboarding/id-card` | `/onboarding/id-confirm` |

| 마이데이터 동의 | 목표 선택 | 목표별 질문 | 최종 확인 |
| :---: | :---: | :---: | :---: |
| <img width="180" alt="마이데이터 동의" src="https://github.com/user-attachments/assets/c87045a8-d4a0-4f24-a9b9-547257e31650" /> | <img width="180" alt="목표 선택" src="https://github.com/user-attachments/assets/125c3b94-cff6-44fa-952c-46d5fdc59ad9" /> | <img width="180" alt="목표별 질문" src="https://github.com/user-attachments/assets/0ef74b76-4fbe-4039-90b7-043182e72b1e" /> | <img width="180" alt="최종 확인" src="https://github.com/user-attachments/assets/98e62e47-32ef-4da8-998b-5326152420eb" /> |
| ON-003A · `/onboarding/mydata` | ON-004 · `/onboarding/goal` | ON-005 · `/onboarding/questions` | ON-006 · `/onboarding/confirm` |

### AI 채팅

답변을 스트리밍으로 받고, 송금·상품·점수·로드맵 카드를 함께 보여 줍니다. 환영 화면은 환영 설정이 있는 국적(현재 필리핀)만 챗봇 전에 한 번 봅니다.

| 국적별 환영 | 채팅 첫 화면 |
| :---: | :---: |
| <img width="180" alt="국적별 환영" src="https://github.com/user-attachments/assets/83120f7e-2004-40af-84b7-e8c2a8ded4df" /> | <img width="180" alt="채팅 첫 화면" src="https://github.com/user-attachments/assets/3992a42b-3986-4473-bf38-1f5d141834a6" /> |
| `/welcome` | `/chat` |

### 송금과 환율

| 해외송금 | 송금 진행 | 환율 정보 | 목표 환율 알림 |
| :---: | :---: | :---: | :---: |
| <img width="180" alt="해외송금" src="https://github.com/user-attachments/assets/089b2ea9-ad29-4643-917d-e7052a9a8a06" /> | <img width="180" alt="송금 진행" src="https://github.com/user-attachments/assets/55609606-b8d4-4a48-8b46-575efc2088b3" /> | <img width="180" alt="환율 정보" src="https://github.com/user-attachments/assets/0d063520-8fae-4bdf-b2b9-aeeef9eee0fa" /> | <img width="180" alt="목표 환율 알림" src="https://github.com/user-attachments/assets/dbe57fcb-1322-4039-bc5c-adc4b48f48ba" /> |
| TR-001 · `/transfer` | `/transfer/complete` | FX-001 · `/fx` | FX-002 · `/fx/alert` |

### 저축, 대출, 체류

| 금융상품 추천 | 대안신용 사전진단 | SOL 글로벌론 상세 |
| :---: | :---: | :---: |
| <img width="180" alt="금융상품 추천" src="https://github.com/user-attachments/assets/49102c1b-def3-470c-a8f3-83a432360c0a" /> | <img width="180" alt="대안신용 사전진단" src="https://github.com/user-attachments/assets/6e8f7a62-701a-4b96-a146-166ef8b4fa00" /> | <img width="180" alt="SOL 글로벌론 상세" src="https://github.com/user-attachments/assets/4b30105f-016c-4c22-bd87-1ec4b89da7de" /> |
| FP-001 · `/finance/products` | CR-001 · `/credit` | CR-002 · `/credit/loan` |

화면은 서버가 준 값을 형식만 바꿔 보여 줍니다. 점수, 금액, 환율 대비, 가입 조건 판단은 화면에서 계산하지 않습니다.

## 기술 스택

| 구분 | 사용 |
| --- | --- |
| 프레임워크 | Expo SDK 58, React Native 0.88, React 19 (iOS·Android를 한 코드로) |
| 언어 | TypeScript |
| 라우팅 | Expo Router (`src/app/`의 파일이 곧 화면) |
| 상태 관리 | Zustand |
| 통신 | axios, SSE(채팅 스트리밍) |
| 다국어 | i18next, react-i18next |
| 테스트 | Jest, React Native Testing Library |
| 빌드 | EAS Build |

## 시작하기

### 준비

- Node.js, npm
- 폰에서 확인하려면 Expo Go 앱 또는 개발 빌드

### 실행

```bash
npm install
cp .env.example .env.local
npx expo start
```

터미널에 나오는 QR 코드를 폰으로 찍어 엽니다.

### 환경 변수

`.env.local`은 Git에서 제외됩니다. 값을 바꾼 뒤에는 `npx expo start -c`로 다시 켜야 반영됩니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `EXPO_PUBLIC_USE_MOCK` | `true` | `true`면 서버 없이 명세 예시 값으로 동작합니다. 백엔드에 실제로 붙일 때만 `false`로 바꿉니다. |
| `EXPO_PUBLIC_API_URL` | - | 서버 주소. 폰에서 접속하므로 `localhost`가 아니라 PC의 IP를 씁니다. (예: `http://192.168.0.10:8080`) |
| `EXPO_PUBLIC_ENTRY_TOKEN` | `demo-e9-ph-reyes` | SOL 진입 토큰. 데모는 기본값으로 동작하므로 생략해도 됩니다. |
| `EXPO_PUBLIC_MOCK_OCR_FAILURE` | 비어 있음 | Mock에서 등록증 OCR 실패를 재현합니다. 쓸 수 있는 값은 `.env.example` 참고 |

처음에는 `EXPO_PUBLIC_USE_MOCK=true` 그대로 두면 백엔드와 AI 서버 없이 모든 화면을 볼 수 있습니다.

### 검사

```bash
npx expo lint       # 린트
npx tsc --noEmit    # 타입 검사
npm test            # 테스트
```

2026.11.24 develop 브랜치 기준 테스트는 99개입니다.

### 빌드

`eas.json`의 `preview` 프로필은 운영 서버에 붙는 Android APK를 만듭니다.

```bash
npx eas-cli@latest build --profile preview --platform android
```

## 폴더 구조

```
src/
├── app/            화면. 파일 경로가 곧 주소 (Expo Router)
│   ├── (tabs)/     채팅, 체류자격 로드맵 탭
│   ├── onboarding/ 온보딩 ON-001 ~ ON-006
│   ├── credit/     대안신용 사전진단, SOL 글로벌론
│   ├── finance/    금융상품 추천
│   ├── fx/         환율 정보, 목표 환율 알림
│   └── transfer/   해외송금
├── api/            서버 호출. 화면은 여기서만 데이터를 받음
│   └── mock/       USE_MOCK=true일 때 쓰는 예시 응답
├── components/     공통 컴포넌트 (Button, Pill, ScoreRow, StepCard 등)
├── features/       화면 전용 로직 (채팅 카드, 데모 초기화, 환영 화면)
├── constants/      theme 토큰, 온보딩 단계, 언어·국가 목록
├── hooks/          공통 훅
├── i18n/           화면 문구 (ko, en)
├── store/          Zustand 스토어 (인증, 온보딩, 송금, 토스트)
├── types/          API 타입
└── utils/          형식 변환, 알림, 이미지 처리
docs/api/openapi.json   백엔드 API 명세
docs/screenshots/       README에 쓰는 화면 캡처
```

## 개발 규칙

- 화면은 `src/api`에서만 데이터를 받습니다. Mock과 실제 서버 전환은 `src/api` 안에서 처리합니다.
- 색, 글자, 간격은 `src/constants/theme.ts`의 토큰만 씁니다.
- 화면 문구는 `src/i18n`에 둡니다.
- 패키지는 `npx expo install <패키지>`로 추가합니다. SDK에 맞는 버전이 설치됩니다.
- PR은 `develop` 브랜치로 보내고, 제목은 `[태그] 기능` 형식으로 씁니다. 자세한 항목은 `.github/pull_request_template.md`를 따릅니다.

## 데모

- 데모 계정 토큰은 `demo-e9-ph-reyes`입니다.
- 데모 토큰일 때 SOL Global 홈의 "SOL Global" 로고를 1.5초 안에 3번 누르면 데모 계정을 초기화하고 온보딩을 처음부터 다시 시작합니다.

## 유의 사항

- SOL Global 홈 화면은 시연을 위해 재현한 것이며, AI 버튼 외의 요소는 동작하지 않습니다.
- 대안신용 점수와 한도는 모의 사전진단이며 실제 대출 승인이나 신용점수가 아닙니다.
- 이 프로젝트는 교육 과정의 결과물이며 신한은행의 공식 서비스가 아닙니다.
