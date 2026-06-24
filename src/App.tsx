import { onMount, createSignal, Show, onCleanup, For, createEffect } from 'solid-js';
import { Game, type GameState, CHARACTERS } from './game/Game';

interface LeaderboardEntry {
    name: string;
    score: number;
}

const App = () => {
    let canvasRef: HTMLCanvasElement | undefined;
    let gameInstance: Game | undefined;

    const [score, setScore] = createSignal(0);
    const [highScore, setHighScore] = createSignal(
        Number(localStorage.getItem('flappy-high-score') || 0)
    );
    const [gameState, setGameState] = createSignal<GameState>('READY');
    const [leaderboard, setLeaderboard] = createSignal<LeaderboardEntry[]>([]);
    const [userName, setUserName] = createSignal(localStorage.getItem('flappy-user-name') || '');
    const [isSubmitting, setIsSubmitting] = createSignal(false);
    const [hasSubmitted, setHasSubmitted] = createSignal(false);

    // Coin & Character Shop signals
    const [coins, setCoins] = createSignal(
        Number(localStorage.getItem('flappy-candy-coins') || 0)
    );
    const [activeCharacter, setActiveCharacter] = createSignal(
        localStorage.getItem('flappy-active-character') || 'goldy'
    );
    const [unlockedCharacters, setUnlockedCharacters] = createSignal<string[]>(
        JSON.parse(localStorage.getItem('flappy-unlocked-characters') || '["goldy"]')
    );
    const [isShopOpen, setIsShopOpen] = createSignal(false);

    // Skill cooldown signals
    const [skillCdRemaining, setSkillCdRemaining] = createSignal(0);
    const [skillCdDuration, setSkillCdDuration] = createSignal(1);

    // Boss battle signals
    const [bossHp, setBossHp] = createSignal(100);
    const [bossMaxHp, setBossMaxHp] = createSignal(100);
    const [showBossHp, setShowBossHp] = createSignal(false);

    // Audio state
    const [bgmEnabled, setBgmEnabled] = createSignal(
        localStorage.getItem('flappy-bgm-enabled') !== 'false'
    );

    // Responsive scaling state
    const [scale, setScale] = createSignal(1);

    const updateScale = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Game frame is 400x600, with border thickness (8px * 2) = 416x616 total dimensions
        const scaleX = (w - 24) / 416;
        const scaleY = (h - 24) / 616;
        // Cap at 1.0 (do not enlarge on giant desktops, only scale down on smaller mobile devices)
        const fitScale = Math.min(1.0, Math.min(scaleX, scaleY));
        setScale(fitScale);
    };

    const isTopScore = () => {
        if (score() === 0) return false;
        if (leaderboard().length < 5) return true;
        return score() > (leaderboard()[leaderboard().length - 1]?.score || 0);
    };

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/api/leaderboard');
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(data);
            } else {
                throw new Error("Server response failed");
            }
        } catch (e) {
            console.warn('Leaderboard fetch failed (offline mode):', e);
            // Fallback: Populate list with player's own local best
            setLeaderboard([
                { name: userName() || "YOU", score: highScore() }
            ]);
        }
    };

    const submitScore = async () => {
        if (!userName() || isSubmitting() || hasSubmitted()) return;
        
        setIsSubmitting(true);
        localStorage.setItem('flappy-user-name', userName());
        
        try {
            const res = await fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: userName(), score: score() })
            });
            if (res.ok) {
                setHasSubmitted(true);
                await fetchLeaderboard();
            } else {
                throw new Error("Server rejection");
            }
        } catch (e) {
            console.warn('Score submission failed (offline mode):', e);
            // Offline fallback: Simulate successful register and update local view
            setHasSubmitted(true);
            setLeaderboard([
                { name: userName().toUpperCase().slice(0, 8), score: score() }
            ]);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Purchase character handler
    const handlePurchaseOrEquip = (charId: string, price: number) => {
        if (unlockedCharacters().includes(charId)) {
            // Equip
            setActiveCharacter(charId);
            localStorage.setItem('flappy-active-character', charId);
        } else {
            // Try purchase
            if (coins() >= price) {
                const updatedUnlocked = [...unlockedCharacters(), charId];
                setUnlockedCharacters(updatedUnlocked);
                localStorage.setItem('flappy-unlocked-characters', JSON.stringify(updatedUnlocked));
                
                // Deduct coins
                const newCoins = coins() - price;
                setCoins(newCoins);
                localStorage.setItem('flappy-candy-coins', String(newCoins));
                
                // Equip immediately
                setActiveCharacter(charId);
                localStorage.setItem('flappy-active-character', charId);
            }
        }
    };

    onMount(() => {
        fetchLeaderboard();
        
        // Setup resizing bindings
        updateScale();
        window.addEventListener('resize', updateScale);

        if (canvasRef) {
            const game = new Game(
                canvasRef, 
                (s) => {
                    setScore(s);
                    if (s > highScore()) {
                        setHighScore(s);
                        localStorage.setItem('flappy-high-score', s.toString());
                    }
                },
                (state) => {
                    setGameState(state);
                    if (state === 'PLAYING') {
                        setHasSubmitted(false);
                    }
                },
                () => {
                    // Sync coins from game
                    setCoins(Number(localStorage.getItem('flappy-candy-coins') || 0));
                },
                (remaining, duration) => {
                    setSkillCdRemaining(remaining);
                    setSkillCdDuration(duration);
                },
                (hp, maxHp) => {
                    setBossHp(hp);
                    setBossMaxHp(maxHp);
                    setShowBossHp(hp > 0 && gameState() === 'BOSS_FIGHT');
                }
            );

            gameInstance = game;
            game.start();

            // Set initially equipped character
            game.setPlayerCharacter(activeCharacter());

            // Reactive sync for active character change
            createEffect(() => {
                game.setPlayerCharacter(activeCharacter());
            });

            onCleanup(() => {
                game.stop();
                window.removeEventListener('resize', updateScale);
            });
        }
    });

    const triggerSkill = (e: MouseEvent) => {
        e.stopPropagation(); // Avoid jumping
        if (gameInstance) {
            gameInstance.useActiveSkill();
        }
    };

    const currentCharacterData = () => {
        return CHARACTERS.find(c => c.id === activeCharacter()) || CHARACTERS[0]!;
    };

    // Cooldown percentage for SVG wheel/progress bar
    const cooldownPercent = () => {
        if (skillCdRemaining() <= 0) return 0;
        return (skillCdRemaining() / skillCdDuration()) * 100;
    };

    return (
        <div style={{ 
            position: 'relative', 
            'user-select': 'none',
            display: 'flex',
            'justify-content': 'center',
            'align-items': 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #ffeaf2 0%, #efe5fd 50%, #e6f5ff 100%)',
            'font-family': '"Fredoka", "Nunito", sans-serif'
        }}>
            <div style={{ 
                position: 'relative', 
                width: '400px', 
                height: '600px', 
                overflow: 'hidden', 
                'border-radius': '24px', 
                'border': '8px solid #4a2c00', 
                'box-shadow': '0 30px 75px rgba(74, 44, 0, 0.28)',
                'transform': `scale(${scale()})`,
                'transform-origin': 'center',
                'transition': 'transform 0.1s ease-out'
            }}>
                {/* Score UI */}
                <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: '#fff275',
                    'font-size': '68px',
                    'font-weight': '900',
                    'text-shadow': '4px 4px 0px #4a2c00',
                    'z-index': 10,
                    'pointer-events': 'none'
                }}>
                    {score()}
                </div>

                {/* BGM Toggle button */}
                <button 
                    onClick={() => {
                        const nextState = !bgmEnabled();
                        setBgmEnabled(nextState);
                        if (gameInstance) {
                            gameInstance.audio.toggleBGM(nextState);
                        }
                    }}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        left: '18px',
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '2.5px solid #4a2c00',
                        'border-radius': '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        cursor: 'pointer',
                        'font-size': '14px',
                        'z-index': 15,
                        'box-shadow': '0 4px 6px rgba(74, 44, 0, 0.15)',
                        'transition': 'all 0.1s ease'
                    }}
                >
                    {bgmEnabled() ? '🔊' : '🔇'}
                </button>

                {/* Best Score Label */}
                <div style={{
                    position: 'absolute',
                    top: '14px',
                    right: '18px',
                    color: '#ffeaa7',
                    'font-size': '15px',
                    'font-weight': 'bold',
                    'text-shadow': '2.5px 2.5px 0px #4a2c00',
                    'z-index': 10,
                    'pointer-events': 'none'
                }}>
                    👑 BEST: {highScore()}
                </div>

                {/* Boss HP Bar */}
                <Show when={showBossHp()}>
                    <div style={{
                        position: 'absolute',
                        top: '115px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '260px',
                        height: '18px',
                        'background-color': 'rgba(74, 44, 0, 0.35)',
                        'border': '3px solid #4a2c00',
                        'border-radius': '10px',
                        'overflow': 'hidden',
                        'z-index': 11
                    }}>
                        <div style={{
                            width: `${(bossHp() / bossMaxHp()) * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #ff7675 0%, #d63031 100%)',
                            'border-radius': '6px',
                            'transition': 'width 0.15s ease-out'
                        }} />
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#ffffff',
                            'font-size': '10px',
                            'font-weight': '900',
                            'text-shadow': '1px 1px 0px #4a2c00',
                            'pointer-events': 'none',
                            'white-space': 'nowrap'
                        }}>
                            CANDY GIANT: {bossHp()}%
                        </div>
                    </div>
                </Show>

                {/* Candy Star Coin Counter */}
                <div style={{
                    position: 'absolute',
                    top: '14px',
                    left: '18px',
                    color: '#ffffff',
                    'background': 'rgba(74, 44, 0, 0.65)',
                    'border': '2.5px solid #4a2c00',
                    'border-radius': '16px',
                    'padding': '4px 10px',
                    'font-size': '14px',
                    'font-weight': 'bold',
                    'display': 'flex',
                    'align-items': 'center',
                    'gap': '5px',
                    'z-index': 10,
                    'cursor': 'pointer'
                }} onClick={(e) => { e.stopPropagation(); setIsShopOpen(true); }}>
                    <span>🌟</span>
                    <span>{coins()}</span>
                </div>

                {/* Active Skill Overlay during game */}
                <Show when={gameState() === 'PLAYING'}>
                    <div style={{
                        position: 'absolute',
                        bottom: '55px',
                        right: '15px',
                        'z-index': 15,
                        display: 'flex',
                        'flex-direction': 'column',
                        'align-items': 'center'
                    }}>
                        <Show when={currentCharacterData().id !== 'goldy'} fallback={
                            // Goldy passive description
                            <div style={{
                                'background': 'rgba(255, 255, 255, 0.75)',
                                'border': '2px solid #4a2c00',
                                'border-radius': '10px',
                                'padding': '4px 8px',
                                'font-size': '10px',
                                'font-weight': 'bold',
                                'color': '#4a2c00',
                                'text-align': 'center',
                                'width': '80px'
                            }}>
                                🧲 PASSIVE MAGNET
                            </div>
                        }>
                            <button 
                                onClick={triggerSkill}
                                disabled={skillCdRemaining() > 0}
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    'border-radius': '50%',
                                    'background': skillCdRemaining() > 0 ? '#b2bec3' : '#ff7675',
                                    'border': '3.5px solid #4a2c00',
                                    'box-shadow': skillCdRemaining() > 0 ? 'none' : '0 4px 0 #4a2c00',
                                    'cursor': skillCdRemaining() > 0 ? 'not-allowed' : 'pointer',
                                    'position': 'relative',
                                    'display': 'flex',
                                    'justify-content': 'center',
                                    'align-items': 'center',
                                    'font-size': '24px',
                                    'transition': 'all 0.1s'
                                }}
                                onMouseDown={(e) => {
                                    if (skillCdRemaining() <= 0) e.currentTarget.style.transform = 'translateY(4px)';
                                }}
                                onMouseUp={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                {/* Skill Icon representation */}
                                {currentCharacterData().id === 'cherry' ? '💥' : 
                                 currentCharacterData().id === 'berry' ? '🛡️' : 
                                 currentCharacterData().id === 'mango' ? '🧲' : 
                                 currentCharacterData().id === 'kiwi' ? '🥝' : 
                                 currentCharacterData().id === 'minty' ? '🍃' : 
                                 currentCharacterData().id === 'lemon' ? '⚡' : 
                                 currentCharacterData().id === 'choco' ? '🍫' : '🔮'}

                                {/* Cooldown Overlay */}
                                <Show when={skillCdRemaining() > 0}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '-3.5px',
                                        left: '-3.5px',
                                        width: '56px',
                                        height: '56px',
                                        'border-radius': '50%',
                                        'border': '3.5px solid rgba(0,0,0,0.5)',
                                        'background': 'rgba(0, 0, 0, 0.45)',
                                        'color': 'white',
                                        'display': 'flex',
                                        'justify-content': 'center',
                                        'align-items': 'center',
                                        'font-size': '14px',
                                        'font-weight': '900'
                                    }}>
                                        {Math.ceil(skillCdRemaining() / 1000)}s
                                    </div>
                                </Show>
                            </button>
                            <span style={{
                                'font-size': '10px',
                                'font-weight': '900',
                                'color': '#4a2c00',
                                'margin-top': '4px',
                                'background': '#fff9e6',
                                'border': '1.5px solid #4a2c00',
                                'padding': '2px 6px',
                                'border-radius': '6px'
                            }}>
                                {currentCharacterData().skillName}
                            </span>
                        </Show>
                    </div>
                </Show>

                {/* Ready Screen Shop Access Button */}
                <Show when={gameState() === 'READY'}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsShopOpen(true); }}
                        style={{
                            position: 'absolute',
                            bottom: '135px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            'z-index': 10,
                            'background': '#ff7675',
                            'color': 'white',
                            'border': '3.5px solid #4a2c00',
                            'border-radius': '18px',
                            'padding': '6px 20px',
                            'font-size': '15px',
                            'font-weight': 'bold',
                            'cursor': 'pointer',
                            'box-shadow': '0 4px 0 #4a2c00',
                            'transition': 'all 0.1s',
                            'white-space': 'nowrap'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'translate(-50%, 4px)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'translate(-50%, 0)'}
                    >
                        🍭 CHUBBY SHOP 🍭
                    </button>
                </Show>

                {/* Game Over UI */}
                <Show when={gameState() === 'GAME_OVER'}>
                    <div 
                        onClick={(e) => e.stopPropagation()} 
                        style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            background: 'rgba(53, 44, 74, 0.65)',
                            display: 'flex',
                            'flex-direction': 'column',
                            'justify-content': 'center',
                            'align-items': 'center',
                            color: '#4a2c00',
                            'z-index': 20,
                            'backdrop-filter': 'blur(5px)'
                        }}
                    >
                        <div style={{
                            background: '#fff9e6', 
                            padding: '20px',
                            'border-radius': '24px',
                            'border': '5px solid #4a2c00',
                            'text-align': 'center',
                            'box-shadow': '0 12px 30px rgba(0,0,0,0.4)',
                            width: '290px',
                            'font-family': '"Fredoka", sans-serif'
                        }}>
                            <h1 style={{ 
                                'font-size': '28px', 
                                margin: '0 0 10px 0', 
                                color: '#ff7675',
                                'text-shadow': '2.5px 2.5px 0 #4a2c00',
                                'font-weight': 'bold'
                            }}>GAME OVER</h1>
                            
                            {/* Score Display */}
                            <div style={{ 
                                'background': '#ffffff', 
                                'padding': '8px 12px', 
                                'border-radius': '14px', 
                                'border': '3px solid #4a2c00',
                                'margin-bottom': '10px',
                                'display': 'flex',
                                'justify-content': 'space-around'
                            }}>
                                <div>
                                    <div style={{ 'font-size': '11px', 'color': '#7f8c8d' }}>SCORE</div>
                                    <div style={{ 'font-size': '18px', 'font-weight': 'bold' }}>{score()}</div>
                                </div>
                                <div>
                                    <div style={{ 'font-size': '11px', 'color': '#7f8c8d' }}>BEST</div>
                                    <div style={{ 'font-size': '18px', 'font-weight': 'bold' }}>{highScore()}</div>
                                </div>
                            </div>

                            {/* Leaderboard Submission */}
                            <Show when={isTopScore() && !hasSubmitted()}>
                                <div style={{ 
                                    'margin-bottom': '10px', 
                                    'background': '#ffeaa7',
                                    'padding': '10px', 
                                    'border-radius': '14px',
                                    'border': '3px solid #4a2c00'
                                }}>
                                    <div style={{ 'font-size': '12px', 'margin-bottom': '6px', 'font-weight': 'bold', color: '#ff7675' }}>
                                        🎉 NEW HIGH SCORE! 🎉
                                    </div>
                                    <div style={{ display: 'flex', 'justify-content': 'center', 'align-items': 'center', gap: '5px' }}>
                                        <input 
                                            type="text" 
                                            placeholder="YOUR NAME" 
                                            class="cute-input"
                                            value={userName()}
                                            onInput={(e) => setUserName(e.currentTarget.value.toUpperCase().slice(0, 8))}
                                            style={{
                                                padding: '6px',
                                                width: '110px',
                                                'border-radius': '8px',
                                                'border': '3px solid #4a2c00',
                                                'text-align': 'center',
                                                'font-weight': 'bold',
                                                'font-family': '"Fredoka", sans-serif',
                                                'color': '#4a2c00',
                                                'background': '#ffffff',
                                                'font-size': '12px'
                                            }}
                                        />
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                submitScore();
                                            }}
                                            disabled={isSubmitting() || !userName()}
                                            style={{
                                                padding: '6px 12px',
                                                'background': '#1dd1a1',
                                                'color': 'white',
                                                'border': '3px solid #4a2c00',
                                                'border-radius': '8px',
                                                'font-weight': 'bold',
                                                'cursor': 'pointer',
                                                'font-family': '"Fredoka", sans-serif',
                                                'box-shadow': '0 3px 0 #4a2c00',
                                                'font-size': '12px',
                                                opacity: isSubmitting() || !userName() ? 0.5 : 1
                                            }}
                                        >
                                            {isSubmitting() ? '...' : 'SEND'}
                                        </button>
                                    </div>
                                </div>
                            </Show>

                            {/* Mini Leaderboard */}
                            <div style={{ 
                                'text-align': 'left', 
                                'font-size': '13px', 
                                'background': '#e3f2fd',
                                'padding': '8px 12px', 
                                'border-radius': '14px',
                                'border': '3px solid #4a2c00',
                                'color': '#4a2c00'
                            }}>
                                <div style={{ 
                                    'font-weight': 'bold', 
                                    'margin-bottom': '4px', 
                                    'border-bottom': '2.5px solid #4a2c00', 
                                    'padding-bottom': '3px',
                                    'text-align': 'center'
                                }}>
                                    🏆 TOP PLAYERS
                                </div>
                                <For each={leaderboard()}>
                                    {(entry, i) => (
                                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '2px', 'font-weight': '600' }}>
                                            <span>{i() + 1}. {entry.name}</span>
                                            <span style={{ 'font-weight': 'bold', color: '#ff7675' }}>{entry.score} pts</span>
                                        </div>
                                    )}
                                </For>
                            </div>

                            {/* Buttons footer inside Game Over */}
                            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-top': '14px', gap: '8px' }}>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsShopOpen(true); }}
                                    style={{
                                        flex: 1,
                                        'background': '#fdcb6e',
                                        'color': 'white',
                                        'border': '3px solid #4a2c00',
                                        'border-radius': '16px',
                                        'padding': '8px 0',
                                        'font-weight': 'bold',
                                        'cursor': 'pointer',
                                        'box-shadow': '0 4px 0 #4a2c00',
                                        'font-family': '"Fredoka", sans-serif'
                                    }}
                                >
                                    🍭 SHOP
                                </button>
                                <div 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (gameInstance) gameInstance.restartGame();
                                    }}
                                    style={{ 
                                        flex: 2,
                                        'font-size': '14px', 
                                        'animation': 'pulse 1.2s infinite',
                                        'background': '#ff7675',
                                        'color': 'white',
                                        'padding': '8px 10px',
                                        'border-radius': '16px',
                                        'border': '3px solid #4a2c00',
                                        'font-weight': 'bold',
                                        'cursor': 'pointer',
                                        'box-shadow': '0 4px 0 #4a2c00'
                                    }}
                                >
                                    🍭 RESTART 🍭
                                </div>
                            </div>
                        </div>
                    </div>
                </Show>

                {/* Character Shop Modal Overlay */}
                <Show when={isShopOpen()}>
                    <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '100%',
                        background: 'rgba(53, 44, 74, 0.7)',
                        'z-index': 30,
                        display: 'flex',
                        'justify-content': 'center',
                        'align-items': 'center',
                        'backdrop-filter': 'blur(8px)'
                    }} onClick={(e) => { e.stopPropagation(); setIsShopOpen(false); }}>
                        
                        {/* Shop Panel */}
                        <div style={{
                            background: '#fff9e6',
                            width: '320px',
                            'border-radius': '24px',
                            'border': '6px solid #4a2c00',
                            'padding': '20px',
                            'box-shadow': '0 15px 35px rgba(0,0,0,0.5)',
                            'font-family': '"Fredoka", sans-serif',
                            'color': '#4a2c00'
                        }} onClick={(e) => e.stopPropagation()}>
                            
                            {/* Shop Header */}
                            <div style={{ 
                                display: 'flex', 
                                'justify-content': 'space-between', 
                                'align-items': 'center',
                                'border-bottom': '4px solid #4a2c00',
                                'padding-bottom': '10px',
                                'margin-bottom': '15px'
                            }}>
                                <h2 style={{ margin: 0, 'font-size': '24px', color: '#ff7675', 'text-shadow': '2px 2px 0 #4a2c00' }}>
                                    🍭 CHUBBY SHOP
                                </h2>
                                <div style={{
                                    'background': '#ffffff',
                                    'border': '2.5px solid #4a2c00',
                                    'border-radius': '12px',
                                    'padding': '2px 8px',
                                    'font-weight': 'bold',
                                    'font-size': '14px'
                                }}>
                                    🌟 {coins()}
                                </div>
                            </div>

                            {/* Shop List */}
                            <div style={{ 
                                display: 'flex', 
                                'flex-direction': 'column', 
                                gap: '10px',
                                'max-height': '320px',
                                'overflow-y': 'auto',
                                'padding-right': '4px'
                            }}>
                                <For each={CHARACTERS}>
                                    {(char) => {
                                        const isUnlocked = () => unlockedCharacters().includes(char.id);
                                        const isActive = () => activeCharacter() === char.id;

                                        return (
                                            <div style={{
                                                display: 'flex',
                                                'align-items': 'center',
                                                'background': '#ffffff',
                                                'border': isActive() ? '3.5px solid #1dd1a1' : '3.5px solid #4a2c00',
                                                'border-radius': '16px',
                                                'padding': '10px',
                                                gap: '10px',
                                                'box-shadow': isActive() ? '0 0 10px rgba(29, 209, 161, 0.4)' : 'none'
                                            }}>
                                                {/* Mini Character avatar preview */}
                                                <div style={{
                                                    width: '38px',
                                                    height: '38px',
                                                    'border-radius': '50%',
                                                    'background': char.color,
                                                    'border': '3px solid #4a2c00',
                                                    'position': 'relative',
                                                    'flex-shrink': 0,
                                                    'display': 'flex',
                                                    'justify-content': 'center',
                                                    'align-items': 'center'
                                                }}>
                                                    {/* Eye */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '6px',
                                                        right: '6px',
                                                        width: '10px',
                                                        height: '10px',
                                                        background: 'white',
                                                        'border-radius': '50%',
                                                        'border': '1.5px solid #2c3e50'
                                                    }}>
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '2px',
                                                            right: '2px',
                                                            width: '4px',
                                                            height: '4px',
                                                            background: '#2c3e50',
                                                            'border-radius': '50%'
                                                        }} />
                                                    </div>
                                                    {/* Beak */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '12px',
                                                        right: '-4px',
                                                        width: '8px',
                                                        height: '6px',
                                                        background: char.beakColor,
                                                        'border-radius': '4px',
                                                        'border': '1.5px solid #4a2c00'
                                                    }} />
                                                </div>

                                                {/* Info */}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ 'font-weight': 'bold', 'font-size': '15px' }}>{char.name}</div>
                                                    <div style={{ 'font-size': '9px', 'font-weight': '800', color: '#ff7675', 'margin-bottom': '2px' }}>
                                                        {char.skillName}
                                                    </div>
                                                    <div style={{ 'font-size': '9px', color: '#7f8c8d', 'line-height': '1.1' }}>
                                                        {char.skillDesc}
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <button
                                                    onClick={() => handlePurchaseOrEquip(char.id, char.price)}
                                                    disabled={!isUnlocked() && coins() < char.price}
                                                    style={{
                                                        'padding': '6px 10px',
                                                        'border-radius': '10px',
                                                        'border': '2.5px solid #4a2c00',
                                                        'font-weight': 'bold',
                                                        'font-family': '"Fredoka", sans-serif',
                                                        'font-size': '11px',
                                                        'cursor': (!isUnlocked() && coins() < char.price) ? 'not-allowed' : 'pointer',
                                                        'background': isActive() 
                                                            ? '#1dd1a1' 
                                                            : isUnlocked() 
                                                                ? '#74b9ff' 
                                                                : '#fdcb6e',
                                                        'color': 'white',
                                                        'box-shadow': '0 3px 0 #4a2c00',
                                                        'flex-shrink': 0
                                                    }}
                                                >
                                                    {isActive() 
                                                        ? 'ACTIVE' 
                                                        : isUnlocked() 
                                                            ? 'EQUIP' 
                                                            : `🌟 ${char.price}`}
                                                </button>
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>

                            {/* Modal Close */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsShopOpen(false); }}
                                style={{
                                    'margin-top': '18px',
                                    width: '100%',
                                    'background': '#ff7675',
                                    'color': 'white',
                                    'border': '3.5px solid #4a2c00',
                                    'border-radius': '16px',
                                    'padding': '8px 0',
                                    'font-weight': 'bold',
                                    'cursor': 'pointer',
                                    'box-shadow': '0 4px 0 #4a2c00',
                                    'font-family': '"Fredoka", sans-serif'
                                }}
                            >
                                CLOSE SHOP
                            </button>
                        </div>
                    </div>
                </Show>

                {/* Ready State Instructions */}
                <Show when={gameState() === 'READY'}>
                     <div style={{
                        position: 'absolute',
                        bottom: '90px',
                        left: '0',
                        width: '100%',
                        color: 'white',
                        'font-size': '15px',
                        'font-weight': 'bold',
                        'text-align': 'center',
                        'text-shadow': '2px 2px 0px #4a2c00',
                        'animation': 'pulse 1.4s infinite',
                        'letter-spacing': '0.5px',
                        'pointer-events': 'none',
                        'font-family': '"Fredoka", sans-serif'
                    }}>
                        PRESS SPACE OR CLICK TO FLAP!
                    </div>
                </Show>

                <canvas ref={canvasRef} width="400" height="600" />
            </div>
            
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.04); }
                    100% { transform: scale(1); }
                }
                .cute-input:focus {
                    outline: none;
                    border-color: #ff7675 !important;
                    box-shadow: 0 0 10px rgba(255, 118, 117, 0.35);
                }
            `}</style>
        </div>
    );
};

export default App;
