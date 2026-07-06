import { describe, expect, test, beforeAll } from "bun:test";
import { Game, CHARACTERS, Bird, Coin, ItemBox, WeatherSystem, Pipe } from "./Game";

// Mock minimal browser globals needed for game classes instantiation in Bun test environment
beforeAll(() => {
    global.window = {
        AudioContext: class {
            close() { return Promise.resolve(); }
            resume() { return Promise.resolve(); }
            createOscillator() {
                return {
                    type: 'square',
                    frequency: {
                        setValueAtTime: () => {},
                        exponentialRampToValueAtTime: () => {}
                    },
                    connect: () => {},
                    start: () => {},
                    stop: () => {},
                    disconnect: () => {}
                };
            }
            createGain() {
                return {
                    gain: {
                        setValueAtTime: () => {},
                        linearRampToValueAtTime: () => {},
                        exponentialRampToValueAtTime: () => {}
                    },
                    connect: () => {},
                    disconnect: () => {}
                };
            }
            destination = {};
            currentTime = Date.now() / 1000;
        },
        addEventListener: () => {},
        removeEventListener: () => {}
    } as any;
    global.localStorage = {
        getItem: () => "true",
        setItem: () => {}
    } as any;
    global.performance = {
        now: () => Date.now()
    } as any;
    global.HTMLInputElement = class {} as any;
    global.HTMLButtonElement = class {} as any;
    global.KeyboardEvent = class {} as any;
});

describe("Flappy Bird Game Logic Tests", () => {
    test("Characters specification loading", () => {
        expect(CHARACTERS.length).toBe(5);
        expect(CHARACTERS[0]?.id).toBe("goldy");
        expect(CHARACTERS[1]?.skillName).toBe("CANDY BLAST");
    });

    test("Bird initial configuration & properties", () => {
        const bird = new Bird(600);
        expect(bird.x).toBe(80);
        expect(bird.y).toBe(300);
        expect(bird.velocity).toBe(0);
        expect(bird.characterId).toBe("goldy");
        expect(bird.shieldActive).toBe(false);
    });

    test("Coin update physics", () => {
        const coin = new Coin(200, 150);
        expect(coin.x).toBe(200);
        expect(coin.y).toBe(150);
        expect(coin.collected).toBe(false);
        coin.update(2.6, 1.0);
        expect(coin.x).toBeLessThan(200);
    });

    test("ItemBox randomized type assignment", () => {
        const box = new ItemBox(300, 200);
        expect(box.collected).toBe(false);
        expect(["magnet", "shield", "double", "fever_drink"]).toContain(box.type);
    });

    test("WeatherSystem sky gradient colors formatting", () => {
        const ws = new WeatherSystem(400, 600);
        const [top, bottom] = ws.getSkyGradientColors(12); // Noon
        expect(top).toMatch(/^#/);
        expect(bottom).toMatch(/^#/);
    });

    test("Dynamic weather gravity & jump power impact", () => {
        const birdStandard = new Bird(600);
        const birdHeavy = new Bird(600);
        
        // 1. Rain gravity test
        birdStandard.update(1.0, false, 1.0);
        birdHeavy.update(1.0, false, 1.15); // Rainy heavy feathers
        expect(birdHeavy.velocity).toBeGreaterThan(birdStandard.velocity);

        // 2. Snow jump power test
        birdStandard.jump(1.0);
        birdHeavy.jump(0.92); // Snowy cold flaps
        expect(birdHeavy.velocity).toBeGreaterThan(birdStandard.velocity); // Jump strength is negative, so smaller absolute value is greater mathematically
    });

    test("Dynamic wind force spring-damper displacement", () => {
        const ws = new WeatherSystem(400, 600);
        const bird = new Bird(600);
        
        // Prevent update from recalculating weather/wind immediately
        const now = performance.now();
        (ws as any).lastWeatherChange = now;
        (ws as any).lastWindChange = now;
        (ws as any).weatherState = 'rainy';
        ws.windForce = 1.2;
        
        // Run update to trigger displacement
        ws.update(16.67, 1.0, 400, 600, bird);
        
        // Bird should push horizontally
        expect(bird.xOffset).toBeGreaterThan(0);
        expect(bird.vx).toBeGreaterThan(0);

        // Under fever, horizontal displacement must instantly freeze/reset to 0
        bird.feverActive = true;
        ws.update(16.67, 1.0, 400, 600, bird);
        expect(bird.xOffset).toBe(0);
        expect(bird.vx).toBe(0);
    });

    test("Game instance boss fight cycles & mechanics", () => {
        // Mock document structure minimally for BossGiant offscreen canvas creation
        if (typeof global.document === "undefined") {
            global.document = {
                createElement: () => ({
                    getContext: () => ({
                        clearRect: () => {},
                        arc: () => {},
                        beginPath: () => {},
                        fill: () => {},
                        stroke: () => {},
                        moveTo: () => {},
                        quadraticCurveTo: () => {},
                        lineTo: () => {},
                        closePath: () => {},
                        createRadialGradient: () => ({ addColorStop: () => {} }),
                        fillRect: () => {},
                        strokeRect: () => {}
                    }),
                    width: 90,
                    height: 130
                })
            } as any;
        }

        const mockContext = {
            canvas: { width: 400, height: 600 },
            clearRect: () => {},
            fillRect: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            restore: () => {},
            save: () => {},
            translate: () => {},
            rotate: () => {},
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createLinearGradient: () => ({ addColorStop: () => {} }),
            drawImage: () => {},
            fillText: () => {},
            strokeText: () => {},
            rect: () => {},
            clip: () => {},
            ellipse: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {},
            setLineDash: () => {},
        };

        const mockCanvas = {
            getContext: () => mockContext,
            addEventListener: () => {},
            removeEventListener: () => {},
            width: 400,
            height: 600
        } as any;

        const scoreCb = () => {};
        const stateCb = () => {};
        const coinCb = () => {};
        const cdCb = () => {};
        const hpCb = () => {};
        const gaugeCb = () => {};

        const game = new Game(mockCanvas, scoreCb, stateCb, coinCb, cdCb, hpCb, gaugeCb);
        
        // 1. Initial State Check
        expect((game as any).state).toBe("READY");
        
        // Start game
        (game as any).handleInput();
        expect((game as any).state).toBe("PLAYING");

        // 2. Boss Trigger Cycle
        (game as any).score = 15;
        // Trigger update loop step
        (game as any).update(16.67);
        
        expect((game as any).state).toBe("BOSS_FIGHT");
        expect((game as any).boss).not.toBeNull();
        expect((game as any).lastBossScore).toBe(0);

        // 3. Cherry skill blast damages boss in boss fight
        game.setPlayerCharacter("cherry");
        (game as any).skillCooldownRemaining = 0;
        const initialBossHp = (game as any).boss.hp;
        game.useActiveSkill();
        expect((game as any).boss.hp).toBeLessThan(initialBossHp); // Should take 12 dmg

        // 4. Mango Dash Slam & Bullet Immunity in boss fight
        game.setPlayerCharacter("mango");
        (game as any).skillCooldownRemaining = 0;
        game.useActiveSkill(); // Activate Honey Rush dash
        expect((game as any).bird.dashActive).toBe(true);

        // Spawn a boss bullet and run update to collide
        const bullet = { x: (game as any).bird.x + (game as any).bird.xOffset, y: (game as any).bird.y, vx: 0, vy: 0, radius: 5, active: true, update: () => {} };
        (game as any).bossBullets.push(bullet as any);
        (game as any).update(16.67);
        // Bullet should be deleted, but bird shouldn't die since it's dashing
        expect((game as any).state).toBe("BOSS_FIGHT");

        // Force collide with boss body while dashing
        (game as any).bird.dashActive = true;
        (game as any).bird.xOffset = (game as any).boss.x + (game as any).boss.width / 2 - (game as any).bird.x;
        (game as any).bird.y = (game as any).boss.y + (game as any).boss.height / 2;
        
        const hpBeforeSlam = (game as any).boss.hp;
        (game as any).update(16.67);
        // Boss should take 20 slam damage and dash should end
        expect((game as any).boss.hp).toBe(hpBeforeSlam - 20);
        expect((game as any).bird.dashActive).toBe(false);

        // Defeat the boss
        (game as any).triggerBossDefeated();
        expect((game as any).state).toBe("PLAYING");
        expect((game as any).boss).toBeNull();
        expect((game as any).lastBossScore).toBe(15);

        // Coins spawned as reward should have isBossReward = true
        const rewardCoin = (game as any).coins[0];
        expect(rewardCoin).toBeDefined();
        expect(rewardCoin.isBossReward).toBe(true);

        // 5. Subsequent boss trigger (next 15 points accumulated, so score = 30)
        (game as any).score = 29;
        (game as any).update(16.67);
        expect((game as any).state).toBe("PLAYING"); // Not yet 30

        (game as any).score = 30;
        (game as any).update(16.67);
        expect((game as any).state).toBe("BOSS_FIGHT"); // Triggered again!
    });
});
