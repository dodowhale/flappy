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

#### `WeatherSystem` (기상 환경 물리 제어기)
- **역할**: 게임 내에 기상 변화(맑음, 비, 눈)를 18초 주기로 발생시키고, 기류(바람)의 무작위 물리력을 생성하여 플레이어에게 외력 물리 작용을 시뮬레이션합니다.
- **주요 특징**:
  - **오브젝트 풀링(Object Pooling)**: 100개의 기상 파티클(`WeatherParticle`)을 생성자에서 일괄 풀링하여 런타임 가비지 컬렉터(GC) 오버헤드를 막습니다.
  - **바람 물리 피드백**: `rainy` 및 `snowy` 상태일 때 좌우 바람의 힘(`windForce`)을 생성하여 새의 수직 속도(`velocity`) 및 수평 오프셋(`xOffset`)을 실시간 변위시킵니다.

#### `BossGiant` (캔디 자이언트 보스)
- **역할**: 점수 15점 이상 시 등장하여, 화면 중앙부에서 위아래로 호버링하며 플레이어를 조준 타격하는 거대 보스 캐릭터.
- **주요 특징**:
  - **오프스크린 캔버스 캐싱(Offscreen Canvas Caching)**: 매 프레임 그라디언트와 벡터 패스(Path)를 렌더링하는 부하를 줄이기 위해 별도의 오프스크린 캔버스(`offscreenCanvas`)에 캐릭터 그래픽을 드로잉 및 캐싱하여 메인 렌더링 파이프라인의 드로우 콜 성능을 극대화합니다.
  - **패턴 제어**: 1.5초 간격으로 플레이어 새의 Y좌표를 겨냥한 조준탄 발사 신호를 이벤트 콜백 형태로 릴레이합니다.

#### `BossBullet` & `PlayerMissile` (보스/플레이어 투사체)
- **`BossBullet`**: 보스가 플레이어 방향의 각도 벡터를 연산하여 등속 직선 운동으로 발사하는 조준탄.
- **`PlayerMissile`**: 보스전 시 플레이어가 점프(`handleInput`)할 때마다 수평 방향으로 자동 사출되어 보스를 타격하는 미사일.

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

### 3.3 날씨 기류 및 강우/강설의 물리 작용
기상 시스템이 `rainy` 혹은 `snowy` 일 때, 6초 주기로 동적 바람 힘($F_{\text{wind}} \in [-1.6, -0.8] \cup [0.8, 1.6]$)이 결정됩니다. (맑은 날인 `sunny` 상태에서는 $F_{\text{wind}} = 0$으로 고정됩니다.) 이 날씨 현상들은 새의 운동 역학에 물리적으로 연동되어 다이나믹한 조작 제어를 요구합니다.

#### 1) 수평 바람 항력 및 스프링-댐퍼 복원 제어
새는 수평 기준점($x=80$, 즉 $x_{\text{offset}}=0$)으로 비행을 유지하려는 복원 추진력을 가집니다. 바람 외력과 복원력이 상호작용하는 수평 운동 방정식은 다음과 같습니다:
- **복원 제어력 ($F_{\text{restore}}$)**:
  $$F_{\text{restore}} = -k \cdot x_{\text{offset}} - c \cdot v_x$$
  *(여기서 탄성계수 $k = 0.04$, 감쇠계수 $c = 0.15$로 댐핑이 있는 복원력을 모방합니다.)*
- **바람 외력 ($F_{\text{wind\_force}}$)**:
  $$F_{\text{wind\_force}} = F_{\text{wind}} \times 0.25$$
- **수평 가속도 ($a_x$) 및 속도/오프셋 상태 갱신**:
  $$a_x = F_{\text{restore}} + F_{\text{wind\_force}}$$
  $$v_x \leftarrow v_x + a_x \cdot \Delta t_{\text{scale}}$$
  $$x_{\text{offset}} \leftarrow x_{\text{offset}} + v_x \cdot \Delta t_{\text{scale}}$$
  *(이 공식을 통해 강풍 시 새가 수평 방향으로 출렁이며 밀려나는 물리 현상이 사실적으로 시뮬레이션됩니다.)*

#### 2) 비 (Rainy Weather) 날씨의 깃털 젖음 (중력 증가) 효과
빗방울이 새의 몸을 적셔 유효 질량이 무거워짐에 따라 하향 중력 가속도가 가산됩니다:
- **중력 가중치 ($M_{\text{gravity}}$)**: $1.15$ (평시 대비 15% 중력 증가)
- **수직 물리 갱신**:
  $$v_y \leftarrow v_y + (g \times 1.15) \cdot \Delta t_{\text{scale}}$$

#### 3) 눈 (Snowy Weather) 날씨의 양력 감소 (점프 감쇄) 및 난기류 요동 효과
폭설과 한파로 인해 날갯짓 추진력이 둔화되고, 흩날리는 눈송이에 의해 미세 수직 난기류가 발생합니다:
- **점프 가중치 ($M_{\text{jump}}$)**: $0.92$ (평시 대비 점프력 8% 둔화)
  $$v_y \leftarrow J_{\text{strength}} \times 0.92$$
- **수직 난기류 임펄스 ($\text{Noise}_{\text{white}}$)**:
  $$v_y \leftarrow v_y + \text{Noise}_{\text{white}} \cdot \Delta t_{\text{scale}}$$
  *(여기서 $\text{Noise}_{\text{white}} \sim \text{Uniform}(-0.06, 0.06)$ 범위의 무작위 백색 소음 외력이 매 프레임 작용하여 위아래로 가늘게 흩날리는 비행감을 연출합니다.)*

#### 4) 무적 피버 상태의 물리 보정
- 무적 피버 상태(`feverActive`가 true)일 때는 원활한 코인 수집과 조작 편의성을 위해 날씨 페널티가 즉시 소멸합니다.
- $$x_{\text{offset}} = 0, \quad v_x = 0, \quad M_{\text{gravity}} = 1.0, \quad M_{\text{jump}} = 1.0$$

### 3.4 보스전 궤적 조준 및 데미지 충돌 판정
- **보스 탄환 궤적 각도 산출**: 보스가 1.5초마다 플레이어 위치($x_{\text{bird}}, y_{\text{bird}}$)를 실시간 추적하여 조준탄의 수평/수직 분속 벡터($v_x, v_y$)를 계산합니다.
  $$\text{dist} = \sqrt{(x_{\text{bird}} - x_{\text{boss}})^2 + (y_{\text{bird}} - y_{\text{boss}})^2}$$
  $$v_x = \frac{x_{\text{bird}} - x_{\text{boss}}}{\text{dist}} \times 4.2, \quad v_y = \frac{y_{\text{bird}} - y_{\text{boss}}}{\text{dist}} \times 4.2$$
- **쉴드 슬램(Shield Slam) 피해 공식**: 플레이어가 쉴드를 장착한 상태에서 보스 충돌 반경(38px) 이내로 충돌 시, 쉴드가 터지며 충돌 방어 및 무적 타임(1.2초) 부여와 함께 보스에게 15의 폭발 대미지를 가합니다.
  $$\text{hp}_{\text{boss}} \leftarrow \max(0, \text{hp}_{\text{boss}} - 15), \quad \text{feverGauge} \leftarrow \min(100, \text{feverGauge} + 5)$$
- **망고 대시 슬램(Dash Slam) 피해 공식**: 플레이어가 망고새의 무적 돌진(`dashActive`가 true) 상태일 때 보스 충돌 반경(38px) 이내로 충돌하면 보스에게 20의 강력한 충돌 대미지를 가하며, 대시 상태가 즉각 해제되고 수평 오프셋 위치가 원래 비행 좌표로 안전하게 복귀됩니다.
  $$\text{hp}_{\text{boss}} \leftarrow \max(0, \text{hp}_{\text{boss}} - 20)$$
- **체리 캔디 블래스트(Candy Blast) 보스 타격 공식**: 보스전 도중 체리새의 액티브 스킬을 시전하면 화면 내의 모든 보스 조준탄(`bossBullets`)이 소멸 파티클과 함께 파괴되며, 보스에게 12의 큰 광역 대미지를 입힙니다.
  $$\text{hp}_{\text{boss}} \leftarrow \max(0, \text{hp}_{\text{boss}} - 12)$$
- **일반 미사일 피해 공식**: 점프당 1발씩 발사되는 플레이어 미사일이 보스 히트박스(40px) 이내로 도달 시 4의 일반 대미지를 입힙니다.
  $$\text{hp}_{\text{boss}} \leftarrow \max(0, \text{hp}_{\text{boss}} - 4), \quad \text{feverGauge} \leftarrow \min(100, \text{feverGauge} + 1)$$

---

## 4. 캐릭터 상점 및 버프 스펙

### 4.1 고유 스킬 및 쿨타임 명세

1. **골디 (기본 병아리)**:
   - **스킬**: `COIN MAGNET` (패시브, 쿨타임 없음)
   - **효과**: 상시 코인 자석(기본 획득 반경 `90px`). 특별한 조작 없이도 맵 상의 코인을 쉽게 모을 수 있는 파밍에 특화된 기본 캐릭터입니다.
2. **체리 (캔디 블래스트)**:
   - **스킬**: `CANDY BLAST` (액티브, 쿨타임 `22초`)
   - **효과**: 화면 내의 모든 파이프를 즉시 파괴하며 하트 파티클을 터트립니다. 파괴한 파이프 1개당 보너스 점수 +1점 및 +1 코인을 획득합니다.
3. **베리 (스타 실드)**:
   - **스킬**: `STAR SHIELD` (액티브, 쿨타임 `24초`)
   - **효과**: 4.5초간 쉴드를 생성하여 충돌을 1회 방어하며, 충돌 시 해당 파이프를 파괴하고 1.2초간 무적 상태가 됩니다.
4. **망고 (허니 러시)**:
   - **스킬**: `HONEY RUSH` (액티브, 쿨타임 `18초`)
   - **효과**: 1.5초간 무적 상태가 되어 앞으로 3배 속도로 돌진하며, 화면 내의 모든 코인을 강력하게 끌어당깁니다(반경 `220px`).
5. **플럼 (쥬시 피버)**:
   - **스킬**: `JUICY FEVER` (액티브, 쿨타임 `26초`)
   - **효과**: 게이지와 무관하게 즉시 5초 동안 피버 모드에 돌입하며 피버 중 획득하는 코인이 2배가 됩니다.

### 4.2 피버 게이지 및 아이템 박스 시스템
- **피버 게이지**: 파이프 통과(Good: +2%, Perfect: +12%), 코인 획득(+2%), 보스 타격(+1%) 시 게이지가 차오르며, 100% 도달 시 5초간 자동으로 무적 피버 모드가 발동되어 코인이 뱀 패턴으로 쏟아집니다.
- **아이템 박스**: 게임 중 20% 확률로 파이프 사이에 선물 상자가 스폰됩니다. 획득 시 5초간 자석, 쉴드, 2배 코인, 또는 피버 게이지 20% 즉시 충전 중 하나의 버프 효과가 적용됩니다.

### 4.3 캔디 자이언트 보스 레이드 스펙
- **트리거 및 단계 전환**: 플레이어의 점수가 15점씩 추가로 누적될 때마다(15점, 30점, 45점...) 일반 파이프 생성이 일시 중단되며, 즉각 경고 알림("WARNING! BOSS APPEARED!")과 함께 `BOSS_FIGHT` 모드로 진입합니다.
- **체력 및 대미지 교환**:
  - 보스 체력: $100\text{ HP}$ (UI 상단에 전용 체력바 렌더링).
  - 플레이어의 기본 물리 점프 시, 플레이어 측 수평 미사일(`PlayerMissile`)이 1발 발사되며 타격 시 $4$ 대미지를 줍니다.
  - 플레이어가 `shieldActive` 상태일 때 보스 본체와 충돌하면 쉴드가 파괴되면서 보스에게 $15$ 대미지를 줍니다(Shield Slam).
  - 플레이어가 `dashActive` (무적 대시) 상태일 때 보스 본체와 충돌하면 보스에게 $20$ 대미지를 주며 대시 무적과 오프셋 비행이 즉시 해제됩니다(Dash Slam).
- **격퇴 보상 및 복구**:
  - 보스 체력이 $0$이 되면 보스가 격퇴되며 해당 좌표 주위로 25개의 코인이 무작위 분산 스폰됩니다.
  - 격퇴 보상 코인은 `isBossReward` 특수 물리 플래그가 지정되어 플레이어의 자력 상태 유무와 관계없이 강력하게 플레이어에게 당겨져 자동 획득됩니다(최대 흡입 반경 $350\text{px}$).
  - 격퇴 즉시 게임 모드는 `PLAYING`으로 복구되며, 복구 시점에 `pipeSpawnTimer`를 0으로 리셋하여 복귀하자마자 장애물이 불공평하게 유저 눈앞에 스폰되는 현상을 사전에 차단합니다.

---

## 5. 백엔드 서버 사양 (`dev.ts` / `server.ts`)
- **역할**: Vite 없이 실행되는 Bun 런타임 환경에서 SolidJS 빌드 및 정적 HTML/JS 파일을 서빙하며, 간단한 RESTful API를 제공합니다.
- **구동 모드**:
  - `dev.ts`: 개발 서버로, 실행 시 매번 `./src/index.tsx`를 컴파일/번들링하여 `./dist`에 저장한 뒤 Hono 서버를 구동합니다.
  - `server.ts`: 프로덕션 서버로, 소스 코드 빌드 과정 없이 이미 빌드된 `./dist` 폴더 내부의 정적 리소스를 직접 서빙하여 빠른 기동과 안정성을 확보합니다.
- **리더보드 API**:
  - `GET /api/leaderboard`: `leaderboard.json` 파일에서 읽어와 메모리에 로드된 상위 5개의 랭킹 기록을 반환합니다.
  - `POST /api/leaderboard`: 플레이어 이름과 점수를 수신하여 랭킹 목록에 추가한 뒤 정렬 및 상위 5개로 잘라 최신 결과를 `leaderboard.json`에 영구히 저장하고 반환합니다. Bun.file API를 활용한 파일 입출력을 통해 서버 재시작 시에도 순위표가 소실되지 않습니다.

---

## 6. 모바일 플랫폼 최적화 (Mobile Optimization)

모바일 브라우저의 특수한 제약 조건과 좁은 화면 규격을 고려하여 다음과 같은 최적화 기법을 도입했습니다.

### 6.1 터치 반응성 최적화 (Touch Interaction)
- **지연 없는 터치 제어**: 모바일 브라우저 특유의 300ms 터치 줌 대기 지연을 방지하고 화면 크기가 작을 때 백그라운드 영역 터치로도 조작을 수행할 수 있도록, `window` 객체에 직접 `touchstart`/`mousedown` 리스너를 바인딩했습니다. 캔버스는 물론 body, html, root 배경 영역의 터치 이벤트까지 수용하여 조작감을 개선했으며, 스타일 시트에 `touch-action: manipulation` 및 `-webkit-tap-highlight-color: transparent`를 선언했습니다.
- **중복 점프 방지 (Double Trigger Prevent)**: 모바일 환경에서 `touchstart`와 `mousedown`이 동시에 처리되어 이중 점프가 일어나는 현상을 막기 위해, 터치/클릭 입력 발생 시 즉각적으로 `e.preventDefault()`를 호출하여 이벤트 중복 평가를 원천 배제했습니다.

### 6.2 실시간 축소 비율 피팅 (Auto-Fit Scaling Matrix)
- 400x600 고정 크기의 게임 프레임이 가로 세로가 협소한 스마트폰(예: 360px 너비 기기) 화면에서 잘리는 현상을 예방하기 위해 **동적 CSS Scale 인자 연산**을 도입했습니다.
- `onMount` 시 및 창 크기 변경(`resize`) 시 뷰포트의 폭과 높이를 실시간 계산하여, 프레임이 스크린보다 클 경우 가로/세로 최솟값 비율에 맞춰 정확히 비율을 축소(`transform: scale(fitScale)`) 렌더링합니다.

---

## 7. Progressive Web App (PWA) 및 오프라인 구동

서버 연결이 완전히 끊긴 환경에서도 언제 어디서나 단독 웹앱으로 구동되고 홈 화면에 설치 가능하도록 PWA 아키텍처를 도입했습니다.

### 7.1 서비스 워커 캐싱 및 중재 전략 ([sw.js](file:///Users/east/work/flappy/sw.js))
- **코어 자산 프리캐싱 (Pre-caching)**: 서비스 워커 설치(`install`) 단계에서 진입점 HTML, SolidJS 컴파일 번들(`dist/index.js`), PWA Manifest, 그리고 앱 아이콘을 캐시 스토리지(`sweet-flappy-cache-v5`)에 즉각 저장합니다.
- **Stale-While-Revalidate (SWR) 중재**: 네트워크 GET 요청 발생 시, 캐시 스토리지에 매칭되는 데이터가 존재하면 즉각 캐시를 반환하여 로딩 시간을 0ms로 단축합니다. 그와 동시에 백그라운드로 서버와 동기화하여 캐시를 조용히 갱신합니다. (네트워크 단절 시에는 에러 없이 캐시 데이터가 정식 서빙됩니다.)

### 7.2 클라이언트-사이드 오프라인 예외 처리 ([src/App.tsx](file:///Users/east/work/flappy/src/App.tsx))
- **리더보드 API 복구**: 서비스 워커 샌드박스 내부에서는 `localStorage` 조회가 불가능하므로, 예외 처리를 클라이언트 단인 `App.tsx`로 이관했습니다.
- 리더보드 조회(`fetchLeaderboard`) 또는 등록(`submitScore`) API 요청이 오프라인 단절로 인해 실패하면, `catch` 문에서 경고를 감지하고 플레이어의 로컬 최고기록(LocalStorage)만을 단독 기입하여 렌더링하거나 성공 시뮬레이션을 돌려 화면이 정지되는 상태를 완벽히 해결했습니다.

### 7.3 오프라인 로컬 리더보드 지속성 스토리지 전략
- **로컬 캐싱 메커니즘**: 네트워크가 완전히 차단된 상태에서도 플레이어 간의 점수 기록 경쟁 재미를 보존하기 위해, `flappy-local-leaderboard` localStorage 키를 생성하여 단말기 로컬 환경에 독립적인 상위 5위 리더보드 정보를 JSON 데이터 구조로 관리합니다.
- **점수 기록 및 정렬 파이프라인**:
  1. 오프라인 상황에서 신기록 달성 후 랭킹 전송(`submitScore`) 요청 시, `catch` 블록으로 예외가 포착되며 로컬 리더보드 파이프라인이 자동 실행됩니다.
  2. 로컬 스토리지에서 기존 리더보드 데이터를 파싱하여 불러온 뒤, 신규 유저 스코어 레코드를 배열에 추가(`push`)합니다.
  3. 배열을 `score` 내림차순(Desc) 기준으로 즉시 정렬한 후, 상위 5개 항목만 슬라이스(`slice(0, 5)`)하여 로컬 스토리지에 재기록하고 SolidJS의 `leaderboard` 시그널로 상태를 갱신해 화면에 렌더링합니다.

---

## 8. 리소스 누수 방지 및 반응형 렌더링 최적화 (Resource & Reactivity Optimization)

웹 게임 애플리케이션의 장시간 플레이 안정성과 프레임 드랍 방지를 위해 메모리 누수 제어 및 렌더링 프레임워크 오버헤드 감축 기법을 도입했습니다.

### 8.1 Web Audio API 컨텍스트 정리 및 누수 차단
- **AudioContext 해제 파이프라인**: SolidJS 컴포넌트 마운트 해제(`onCleanup`) 시 또는 게임 엔진 정지(`stop()`) 시, `AudioManager` 인스턴스에 명시적인 `close()` 파이프라인을 실행합니다.
- `this.ctx.close()`를 동기적으로 호출하여 브라우저 가상 스레드에 할당된 오디오 하드웨어 컨텍스트 리소스를 명확히 반환함으로써, SPA 환경에서 게임 재시작이나 잦은 페이지 진입 시 브라우저 오디오 컨텍스트 개수 한도 초과로 소리가 재생되지 않는 고질적인 오디오 엔진 크래시 문제를 차단합니다.

### 8.2 SolidJS 세밀한 반응성(Fine-Grained Reactivity) 오버헤드 감축
- **Signal 업데이트 임계치 적용**: 쿨타임 타이머(`skillCdRemaining`) 및 피버 게이지(`feverGauge`)는 런타임에 밀리초 단위 혹은 소수점 단위로 지속 업데이트됩니다. 이를 매 프레임 Signal에 곧바로 반영하면, 프레임워크 렌더링 트리에서 불필요한 DOM 상태 비교 연산이 매 프레임 수십 번 발생하여 프레임 드랍을 유발합니다.
- 이를 해결하기 위해 **정수 단위 상태 비교 필터링**을 적용했습니다:
  - **쿨타임 타이머**: 올림된 정수 초(`Math.ceil(cd / 1000)`) 값이 바뀔 때만 Signal을 갱신합니다. (업데이트 횟수 약 60배 감소)
  - **피버 게이지**: 반올림된 정수 백분율(`Math.round(gauge)`) 값이 바뀔 때만 Signal을 갱신합니다.
- 이 정밀 갱신 필터를 통해 SolidJS 내부의 반응성 오버헤드를 극적으로 감축하고 무지개 피버 모드 및 연출 시에도 60FPS의 매끄러운 렌더링을 일관되게 보장합니다.

### 8.3 동적 코인 자석 흡입 물리 공식 보완
- **게임 속도 비례 가속 기법**: 게임 점수가 높아질수록 게임 속도(`speed`)가 증가하는 난이도 매트릭스를 고려하여, 코인 자석 흡입 시의 당김 속도(`pullSpeed`)를 상수로 두지 않고 `speed`에 가산 상수를 더하는 동적 벡터 수식으로 개편했습니다:
  - $$\text{pullSpeed}_{\text{passive}} = \text{speed} + 0.6$$
  - $$\text{pullSpeed}_{\text{active}} = \text{speed} + 4.5$$
- 이를 통해 게임 속도가 최고 3.5에 달하는 Phase 4(고수 단계)에서도 코인이 물리 법칙에 밀려 새를 통과하여 왼쪽으로 멀어지는 현상을 방지하고 기획에 정의된 완벽한 흡입 처리를 완수합니다.

---

## 9. 개발 생산성 및 안전성 확보 (Developer Experience & Safety)

### 9.1 개발 서버 자동 감시 및 재빌드 (Watch Mode)
- **개발 환경 개선 (`dev.ts`)**: 기존 단발성 빌드 구동 방식에서 `fs.watch` 기반의 디렉터리 변경 감지형 백그라운드 컴파일 파이프라인으로 업그레이드하였습니다.
- 개발자가 `src/` 디렉터리 내의 컴포넌트, 물리 엔진 소스 코드 파일(TypeScript, SolidJS TSX)을 수정하여 저장하면 개발 서버 콘솔에서 자동으로 이를 감지하여 `Bun.build`를 호출하고 즉시 `./dist/index.js` 번들 파일을 재구축합니다. 이를 통해 서버 재부팅 없이 웹 브라우저 새로고침만으로 즉시 게임 수정 사항을 반영하여 생산성을 크게 향상시켰습니다.

### 9.2 코어 게임 물리 및 엔티티 단위 테스트 (`src/game/Game.test.ts`)
- **단위 테스트 도입**: 브라우저 샌드박스(Canvas, AudioContext, LocalStorage 등) 하에 돌아가는 게임 비즈니스 로직을 온전히 가두어 실행하기 위해 Bun 내장 `bun:test` 러너에 최적화된 Mocking 레이어를 갖춘 테스트 스위트를 설계 및 구현했습니다.
- **주요 테스트 영역**:
  - `CHARACTERS` 상수의 규격 스펙 검증 (가격, 스킬 정보 유무 등)
  - `Bird` 플레이어의 초기 물리 값 및 상태 전이 데이터 무결성 검증
  - `Coin`과 `ItemBox` 등 게임 재화 및 상자 엔티티의 타임스텝 물리 연산 정합성 검증
  - `WeatherSystem`의 시점별 하늘 그라데이션 컬러 포맷 검증
- 이를 통해 런타임 게임 동작 중에 발생할 수 있는 잠재적 물리 오버플로우나 타입 에러 등의 크래시 요소를 빌드 전에 안전하게 선제 포착할 수 있도록 안전 장치를 마련했습니다.
