# AI Agent Development Guidelines for Flappy Bird

이 문서는 Flappy Bird 웹 게임 프로젝트의 개발을 담당하는 AI 에이전트를 위한 지침입니다.

## 0. 응답 언어
- 이 프로젝트에서 피드백, 응답, 질문은 반드시 한글로 작성하세요.
- 사용자가 특정 출력물의 언어를 명시적으로 요청한 경우에만 해당 요청을 우선합니다.
- 단, 다음은 원문(주로 영어)을 그대로 유지하세요:
  - 코드, 식별자(변수/함수/타입명), 파일 경로, 셸 명령어, 로그/에러 메시지 인용, API 이름, 커밋 메시지 규약 등 원문 유지가 정확성에 필요한 것.
- 코드 주석은 해당 저장소의 기존 주석 언어/스타일을 따르며, 한글을 강제하지 않습니다.

## 1. 기술 스택 (Tech Stack)
- **Runtime & Bundler**: Bun (Vite 미사용)
- **Framework**: SolidJS (Latest)
- **Server**: Hono (for Dev Server & API)
- **Language**: TypeScript (Strict Mode)
- **Rendering**: HTML5 Canvas API
- **Styling**: Vanilla CSS

## 2. SolidJS 반응성 가이드
- **Signal**: 모든 상태 변화는 `createSignal`을 사용합니다.
- **Effect**: 사이드 이펙트는 `createEffect` 내에서 처리합니다.
- **Props**: Props는 비구조화 할당(Destructuring)하지 마세요. 반응성을 잃을 수 있습니다. (`props.data` 형태로 접근)
- **Performance**: 컴포넌트는 오직 한 번만 실행되므로, 렌더링 루프 내에서 불필요한 Signal 생성을 피하세요.

## 3. Game Engine & Canvas 지침
- **Separation of Concerns**: 게임 물리 로직(State Update)과 렌더링 로직(Draw)을 엄격히 분리합니다.
- **Game Loop**: `requestAnimationFrame`을 활용한 통합 게임 루프를 유지합니다.
- **Parallax Rendering**: 최소 2개 이상의 배경 레이어(Clouds, Buildings)를 사용하여 원근감을 구현합니다.
- **Procedural Graphics**: 외부 에셋 없이 Gradient와 Path를 활용하여 시각 효과를 극대화합니다.
- **Difficulty Scaling**: 점수가 높아질수록 `GAME_SPEED`를 증가시키고 파이프 생성 간격을 줄여 난이도를 조절합니다.
- **Synthesized Audio**: Web Audio API를 사용하여 실시간으로 효과음을 합성합니다 (Oscillator 및 Gain 활용).

## 4. 핵심 로직 상세
- **Physics**: `deltaTime` 기반의 가변 타임스텝을 적용하여 프레임 레이트와 독립적인 속도를 보장합니다.
- **Input Handling**: `input`이나 `button` 등의 UI 요소 클릭 시 게임 조작이 발생하지 않도록 이벤트를 필터링합니다.
- **Leaderboard**: 서버 API(`/api/leaderboard`)와 연동하여 상위 5위 기록을 관리하며, 로컬 스토리지와 병행하여 최상위 점수를 유지합니다.

## 4. 코딩 컨벤션
- **Naming**: 
  - 컴포넌트는 `PascalCase` (예: `GameCanvas.tsx`)
  - 일반 함수 및 변수는 `camelCase`
  - 상수는 `UPPER_SNAKE_CASE`
- **Types**: `any` 사용을 금지하며, 인터페이스와 타입을 명확히 정의합니다.
- **Comments**: 복잡한 물리 수식이나 로직에는 JSDoc 형식의 주석을 추가합니다.

## 5. Bun 관련 명령어
- **Dev Server**: `bun run dev` (로직 구현 필요)
- **Build**: `bun run build` (Bun.build 활용)
- **Test**: `bun test`

## 6. 에이전트 협업 지침
- 새로운 기능을 추가하기 전 반드시 `/docs`에 설계를 업데이트하거나 확인하세요.
- `ANTIGRAVITY.md`는 이 파일을 참조하고 있으며, 프로젝트의 메타 지침을 담고 있습니다.
