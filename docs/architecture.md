# 시스템 아키텍처 및 상세 구현 설명서 (Character Shop & Skills)

본 문서는 Flappy Bird 웹 게임의 내부 시스템 설계, 모듈 간의 협력 구조, 코인 재화, 캐릭터 상점, 고유 액티브/패시브 스킬 및 고급 4단계 난이도 스케일링의 구현 사양을 상세히 기술합니다.

---

## 1. 시스템 아키텍처 개요

본 프로젝트는 **관심사 분리(Separation of Concerns)** 원칙에 따라 UI를 담당하는 **SolidJS 뷰 레이어**와 핵심 물리 및 그래픽 렌더링을 담당하는 **Canvas 게임 엔진 레이어**로 명확히 분리하여 설계되었습니다.

```mermaid
graph TD
    SubGraph1[SolidJS View Layer (App.tsx)]
    SubGraph2[Canvas Game Engine (Game.ts)]
    SubGraph3[Hono Backend Server (dev.ts / server.ts)]

    SubGraph1 -->|1. Instantiate & Start| SubGraph2
    SubGraph2 -->|2. Trigger Score/State/Coin Callbacks| SubGraph1
    SubGraph1 -->|3. Reactive Sync via createEffect| SubGraph2
    SubGraph1 -->|4. Read/Write Leaderboard| SubGraph3
    SubGraph2 -->|5. Synthesized Sound SFX| WA[Web Audio API]
    SubGraph2 -->|6. Render Procedural Graphics & Coins| CV[HTML5 Canvas]
```

### 1.1 데이터 및 상태 제어 흐름
1. **독립된 게임 루프**: Canvas 게임 엔진은 SolidJS 컴포넌트의 생명주기(`onMount`) 내에서 인스턴스화되며, `requestAnimationFrame`을 통해 초당 약 60프레임으로 자체 루프를 돕니다.
2. **단방향 상태 전파**: 게임 엔진 내부의 점수(Score) 획득, 코인 획득, 쿨타임 잔여치 갱신, 그리고 게임 오버(Game Over) 등의 상태 전환은 생성자 매개변수로 전달된 콜백 함수들을 통해 SolidJS 뷰 레이어로 즉시 전달됩니다.
3. **반응형 제어 연동**: 상점 모달에서 플레이어가 장착 캐릭터를 변경할 경우 SolidJS의 `createEffect`를 통해 `game.setPlayerCharacter(activeCharacter())`가 즉시 실행되어 엔진 내부의 렌더링 텍스처를 갱신합니다.
4. **로컬 스토리지 동기화**: 최고 점수, 보유 코인(`flappy-candy-coins`), 해금 캐릭터 목록(`flappy-unlocked-characters`)은 브라우저의 LocalStorage에 저장되어 세션이 종료되어도 영구 보존됩니다.

---

## 2. 주요 모듈 및 엔티티 설계

### 2.1 Game Engine 레이어 (`src/game/Game.ts`)

#### `Game` (통합 관리자)
- **역할**: 게임 루프(`loop`) 관리, 입력 제어(`handleInput`), 충돌 검사(`checkCollision`), 스킬 및 버프 타이머 업데이트, 패럴랙스 배경 데이터 관리.
- **주요 메서드**:
  - `useActiveSkill()`: 현재 장착한 캐릭터의 스킬(캔디 블래스트, 스타 실드, 허니 매그닛)을 시전하고 개별 버프 타이머 및 쿨타임을 할당합니다.
  - `update(deltaTime)`: 가변 타임스텝(`timeScale`)을 적용하여 프레임 레이트와 무관하게 일정한 속도로 게임 내 물리 연산, 버프/쿨타임 타이머 차감, 배경 스크롤 속도를 갱신합니다.

#### `Bird` (귀여운 캐릭터 & 버프 모델)
- **역할**: 수직 낙하 및 점프 물리 상태 시뮬레이션, 실시간 회전/날개 펄럭임 렌더링, 액티브 버프 시각 효과.
- **상태 프로퍼티**:
  - `characterId`: `goldy` | `cherry` | `berry` | `mango`를 보관하며 외형 그라디언트를 동적 렌더링합니다.
  - `shieldActive`: 활성화 시 캐릭터 외곽에 파란 오라 링과 공전하는 노란색/하늘색 아기자기한 별빛을 함께 드로잉합니다.
  - `magnetActive`: 활성화 시 캐릭터 외곽에 주황색 자력선 링을 점선으로 드로잉합니다.

#### `Pipe` (수직 기동형 장애물)
- **역할**: 화면 우측에서 생성되어 좌측으로 이동하며, 난이도 페이즈에 따라 상하 왕복 운동을 수행합니다.
- **주요 메서드**:
  - `update(speed, timeScale, canvasHeight, gap)`: 난이도 3단계 이상일 때 상하 이동 수직 속도 `vy`에 맞추어 `topHeight`를 변위시키고, 바운더리 한계치 도달 시 수직 속도를 반전시킵니다.

#### `Coin` (별 사탕 코인)
- **역할**: 파이프 갭 사이 정중앙에 45% 확률로 소환되는 수집용 재화.
- **자석 끌림 효과 (Magnetic Attraction)**:
  - 망고새의 스킬(`magnetActive` 가 true)이거나 기본 병아리 골디(`goldy` 패시브 반경 내)일 때, 코인은 새와의 거리를 계산하여 새의 좌표(`bird.x`, `bird.y`) 방향의 벡터로 빠르게 날아와 자동 획득됩니다.

#### `AudioManager` (효과음 합성기)
- Web Audio API를 활용하여 합성 효과음을 만듭니다.
  - **Coin**: 아르페지오 형식의 맑은 딩동음 (D5 -> A5, 0.12초 재생).
  - **Explode**: 파이프가 부서지는 묵직한 폭발음 (Sawtooth Wave, 0.35초 재생).
  - **ShieldBreak**: 쉴드가 박살 나는 파열음 (Triangle Wave, 0.2초 재생).

---

## 3. 핵심 수학 공식 및 물리 구현

### 3.1 4단계 점진적 난이도 조절 매트릭스
플레이어가 고득점을 올릴 때마다 도전 의식을 유발하기 위해 점수 영역별로 **속도**, **파이프 갭**, **수직 진동 속도**를 동적으로 조절합니다.

| 난이도 페이즈 | 점수 구간 | 게임 속도 (`speed`) | 파이프 갭 (`gap`) | 파이프 상하 속도 (`vy`) |
| :--- | :---: | :---: | :---: | :---: |
| **Phase 1 (새내기)** | 0 ~ 5점 | $2.6$ | $155\text{px}$ | $0$ (움직이지 않음) |
| **Phase 2 (견습)** | 6 ~ 12점 | $2.9$ | $145\text{px}$ | $0$ |
| **Phase 3 (숙련)** | 13 ~ 24점 | $3.2$ | $135\text{px}$ | $\pm 0.55\text{px/frame}$ (천천히 왕복) |
| **Phase 4 (고수)** | 25점 이상 | $3.5$ | $125\text{px}$ | $\pm 1.25\text{px/frame}$ (빠르게 왕복) |

### 3.2 쿨타임 델타 차감 및 동기화
`Game.update(deltaTime)`에서 프레임당 밀리초 단위로 쿨타임을 정밀하게 차감하여 SolidJS에 실시간 비동기 콜백을 보냅니다.

$$\text{skillCooldownRemaining} \leftarrow \max(0, \text{skillCooldownRemaining} - \text{deltaTime})$$

$$\text{remainingSeconds} = \left\lceil \frac{\text{skillCooldownRemaining}}{1000} \right\rceil$$

---

## 4. 캐릭터 상점 및 버프 스펙

### 4.1 고유 스킬 및 쿨타임 명세

1. **골디 (기본 병아리)**:
   - **패시브 자석**: 스킬 쿨타임 없음. 항상 코인 수집 자석 반경이 `60px`로 적용되어 코인을 손쉽게 먹을 수 있습니다.
2. **체리 (캔디 블래스트)**:
   - **액티브 스킬**: 화면 상에 떠 있는 파이프 인스턴스 배열을 즉시 초기화하여 소멸시키고, 파이프 위치마다 14개의 핑크색 하트 파티클을 터트립니다. (쿨타임 `22초`)
3. **베리 (스타 실드)**:
   - **액티브 스킬**: 3.5초간 충돌 무시 쉴드를 켭니다. 쉴드가 활성화된 상태에서 파이프에 부딪치면, 목숨을 1회 살려주는 대신 쉴드가 소멸하고 충돌 지점의 파이프를 파괴합니다. (쿨타임 `25초`)
4. **망고 (허니 매그닛)**:
   - **액티브 스킬**: 5초간 모든 코인을 병아리 중심점으로 강력하게 끌어당기는 광역 흡입기(반경 `150px`)를 활성화합니다. (쿨타임 `16초`)

---

## 5. 백엔드 서버 사양 (`dev.ts` / `server.ts`)
- **역할**: Vite 없이 실행되는 Bun 런타임 환경에서 SolidJS 빌드 및 정적 HTML/JS 파일을 서빙하며, 간단한 RESTful API를 제공합니다.
- **구동 모드**:
  - `dev.ts`: 개발 서버로, 실행 시 매번 `./src/index.tsx`를 컴파일/번들링하여 `./dist`에 저장한 뒤 Hono 서버를 구동합니다.
  - `server.ts`: 프로덕션 서버로, 소스 코드 빌드 과정 없이 이미 빌드된 `./dist` 폴더 내부의 정적 리소스를 직접 서빙하여 빠른 기동과 안정성을 확보합니다.
- **리더보드 API**:
  - `GET /api/leaderboard`: 메모리에 저장된 상위 5개의 랭킹 기록을 반환합니다.
  - `POST /api/leaderboard`: 플레이어 이름과 점수를 수신하여 랭킹 목록에 추가한 뒤 정렬 및 상위 5개로 잘라 최신 결과를 저장 및 반환합니다.

---

## 6. 모바일 플랫폼 최적화 (Mobile Optimization)

모바일 브라우저의 특수한 제약 조건과 좁은 화면 규격을 고려하여 다음과 같은 최적화 기법을 도입했습니다.

### 6.1 터치 반응성 최적화 (Touch Interaction)
- **지연 없는 터치 제어**: 모바일 브라우저 특유의 300ms 터치 줌 대기 지연을 방지하기 위해 캔버스에 `touchstart` 리스너를 직접 바인딩하고, 스타일 시트에 `touch-action: manipulation` 및 `-webkit-tap-highlight-color: transparent`를 선언했습니다.
- **중복 점프 방지 (Double Trigger Prevent)**: 모바일 환경에서 `touchstart`와 `mousedown`이 동시에 처리되어 이중 점프가 일어나는 현상을 막기 위해, 캔버스 터치/클릭 입력 발생 시 즉각적으로 `e.preventDefault()`를 호출하여 이벤트 중복 평가를 원천 배제했습니다.

### 6.2 실시간 축소 비율 피팅 (Auto-Fit Scaling Matrix)
- 400x600 고정 크기의 게임 프레임이 가로 세로가 협소한 스마트폰(예: 360px 너비 기기) 화면에서 잘리는 현상을 예방하기 위해 **동적 CSS Scale 인자 연산**을 도입했습니다.
- `onMount` 시 및 창 크기 변경(`resize`) 시 뷰포트의 폭과 높이를 실시간 계산하여, 프레임이 스크린보다 클 경우 가로/세로 최솟값 비율에 맞춰 정확히 비율을 축소(`transform: scale(fitScale)`) 렌더링합니다.

---

## 7. Progressive Web App (PWA) 및 오프라인 구동

서버 연결이 완전히 끊긴 환경에서도 언제 어디서나 단독 웹앱으로 구동되고 홈 화면에 설치 가능하도록 PWA 아키텍처를 도입했습니다.

### 7.1 서비스 워커 캐싱 및 중재 전략 ([sw.js](file:///Users/east/work/flappy/sw.js))
- **코어 자산 프리캐싱 (Pre-caching)**: 서비스 워커 설치(`install`) 단계에서 진입점 HTML, SolidJS 컴파일 번들(`dist/index.js`), PWA Manifest, 그리고 앱 아이콘을 캐시 스토리지(`sweet-flappy-cache-v1`)에 즉각 저장합니다.
- **Stale-While-Revalidate (SWR) 중재**: 네트워크 GET 요청 발생 시, 캐시 스토리지에 매칭되는 데이터가 존재하면 즉각 캐시를 반환하여 로딩 시간을 0ms로 단축합니다. 그와 동시에 백그라운드로 서버와 동기화하여 캐시를 조용히 갱신합니다. (네트워크 단절 시에는 에러 없이 캐시 데이터가 정식 서빙됩니다.)

### 7.2 클라이언트-사이드 오프라인 예외 처리 ([src/App.tsx](file:///Users/east/work/flappy/src/App.tsx))
- **리더보드 API 복구**: 서비스 워커 샌드박스 내부에서는 `localStorage` 조회가 불가능하므로, 예외 처리를 클라이언트 단인 `App.tsx`로 이관했습니다.
- 리더보드 조회(`fetchLeaderboard`) 또는 등록(`submitScore`) API 요청이 오프라인 단절로 인해 실패하면, `catch` 문에서 경고를 감지하고 플레이어의 로컬 최고기록(LocalStorage)만을 단독 기입하여 렌더링하거나 성공 시뮬레이션을 돌려 화면이 정지되는 상태를 완벽히 해결했습니다.
