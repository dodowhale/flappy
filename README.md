# Flappy Bird (SolidJS + Canvas)

SolidJS와 HTML5 Canvas API, 그리고 Bun + Hono로 구현된 고성능 패럴랙스 플래피 버드 웹 게임입니다.

## 🚀 기술 스택 (Tech Stack)

- **Runtime & Bundler**: Bun
- **Framework**: SolidJS (Latest)
- **Server**: Hono (Dev Server & Leaderboard API)
- **Language**: TypeScript (Strict Mode)
- **Rendering**: HTML5 Canvas API (Procedural Graphics)
- **Audio**: Web Audio API (Synthesized SFX)
- **Styling**: Vanilla CSS

## 📁 프로젝트 구조 (Directory Structure)

```text
├── src/
│   ├── game/
│   │   └── Game.ts       # 게임 물리 엔진, Canvas 렌더링, 오디오 및 엔티티(Bird, Pipe) 관리
│   ├── App.tsx           # 게임 UI 오버레이, 리더보드 폼, SolidJS 뷰 레이어
│   └── index.tsx         # 애플리케이션 진입점
├── docs/
│   ├── game-design.md    # 초기 게임 기획서 및 마일스톤
│   └── architecture.md   # 시스템 아키텍처 및 상세 구현 설명서 (추가 예정)
├── AGENTS.md             # AI 에이전트 개발 지침 & 컨벤션
├── ANTIGRAVITY.md        # 프로젝트 메타 가이드
├── dev.ts                # Hono 기반 개발 서버 및 빌드 스크립트, 리더보드 API (Rebuilds code)
├── server.ts             # Hono 기반 프로덕션 static 파일 서빙 및 리더보드 API (No rebuilds)
├── build.ts              # 배포용 프로덕션 빌드 스크립트
├── index.html            # 웹 진입점 HTML
└── package.json          # 의존성 및 스크립트 정의
```

## 🛠️ 실행 및 빌드 방법 (Getting Started)

### 의존성 설치
```bash
bun install
```

### 개발 서버 실행 (자동 빌드 포함)
Hono 개발 서버를 실행하고, 소스코드가 변경되면 빌드를 수행합니다.
```bash
bun run dev
```
서버가 시작되면 [http://localhost:3000](http://localhost:3000)에서 게임을 플레이할 수 있습니다.

### 프로덕션 빌드
Bun의 빌더를 활용해 최적화 및 경량화된 단일 번들 파일을 생성합니다.
```bash
bun run build
```

## 🎮 게임 특징 및 기능

1. **Procedural Graphics (절차적 그래픽)**: 외부 이미지 에셋 없이 Canvas API의 그라디언트, 경로 및 회전 효과만으로 미려한 2D 그래픽과 애니메이션을 실시간 렌더링합니다.
2. **Seamless Parallax Layering (다층 패럴랙스 스크롤링)**: 구름(가장 느림), 빌딩(중간 속도), 바닥(게임 속도)으로 분리된 3중 레이어로 깊이감 있는 원근감을 선사합니다.
3. **Dynamic Difficulty Scaling (가변 난이도)**: 플레이어의 점수가 높아질수록 게임 스피드가 점진적으로 빨라지고, 파이프의 생성 주기가 단축되어 도전 욕구를 자극합니다.
4. **Synthesized Web Audio (합성 오디오)**: 외부 음원 파일 없이 Web Audio API의 Oscillator와 Gain 노드를 직접 제어하여 점프(Jump), 득점(Score), 충돌(Hit) 시의 레트로 효과음을 생성합니다.
5. **Real-time Leaderboard (실시간 리더보드)**: 최고 기록 달성 시 플레이어 이름을 입력하여 Hono 백엔드 API `/api/leaderboard`를 통해 Top 5 랭킹을 갱신하고 보여줍니다. 로컬 저장소(LocalStorage)와도 동기화됩니다.

