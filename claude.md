# 신한걸음 프론트엔드

## 프로젝트
- 국내 거주 외국인(E-9 중심) 금융·체류 지원 앱 (신한 SOL 앱인앱, 로그인 없음)
- React Native + Expo Router (src/app), TypeScript, npm, Node 24
- 프론트는 나(이지연) 혼자. 백엔드: Spring Boot, OCR: FastAPI + PaddleOCR(내 담당)
- 브랜치: develop에서 feat/xxx → PR → develop (Squash and merge)

## 구조
- src/app: 화면(파일 = 주소). onboarding/(Stack), (tabs)/(Tabs)
- src/components: 공통 UI (Screen, Header, Button, OnboardingProgress, StepBadge, ScreenTitle)
- src/constants/theme.ts: 디자인 토큰. 색·글자·간격은 반드시 토큰 사용 (하드코딩 금지)
- src/constants/onboardingSteps.ts: 온보딩 순서표 (stage 1~4 큰 단계)
- src/store: zustand 전역 상태
- src/api: axios 클라이언트 + 기능별 API, USE_MOCK 스위치

## 디자인
- Figma: https://www.figma.com/design/XSL808i6RdP6WUToLnSTxO (온보딩 신버전 프레임 node 277-5 등)
- 폰트 OneShinhan (Medium/Bold). 굵기는 fontWeight 말고 fontFamily로
- 진행 표시: 큰 단계 4개 (언어·등록증·마이데이터 = 1단계)
- 선택 카드: 흰 카드 + 체크, 버튼 3종(메인/보조/텍스트), 버튼 문구에 단계 숫자 넣지 않기

## API
- 명세: 온보딩 OpenAPI (docs/api/onboarding-openapi.json)
- 모든 요청 Authorization: Bearer (POST /api/v1/auth/entry, 데모 entryToken: demo-e9-nguyen)
- 폰에서 접속하므로 localhost 대신 PC IP 사용
- PUT /onboarding/profile은 residencePurpose만 사용 (나머지 4칸은 사용 안 함)

## 작업 방식
- 한국어 구어체로 설명. 나는 백엔드 경험은 있지만 React/RN은 처음
- 코드를 바꿀 때 무엇을 왜 바꿨는지 짧게 설명하고, 파일 경로를 항상 밝힐 것
- 커밋 메시지: 타입은 영어, 내용은 한글 (feat: 온보딩 ... 추가)
- npm audit fix --force 금지, git push -f 금지