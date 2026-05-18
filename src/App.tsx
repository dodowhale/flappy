import { onMount, createSignal, Show, onCleanup, For } from 'solid-js';
import { Game, type GameState } from './game/Game';

interface LeaderboardEntry {
    name: string;
    score: number;
}

const App = () => {
    let canvasRef: HTMLCanvasElement | undefined;
    const [score, setScore] = createSignal(0);
    const [highScore, setHighScore] = createSignal(
        Number(localStorage.getItem('flappy-high-score') || 0)
    );
    const [gameState, setGameState] = createSignal<GameState>('READY');
    const [leaderboard, setLeaderboard] = createSignal<LeaderboardEntry[]>([]);
    const [userName, setUserName] = createSignal(localStorage.getItem('flappy-user-name') || '');
    const [isSubmitting, setIsSubmitting] = createSignal(false);
    const [hasSubmitted, setHasSubmitted] = createSignal(false);

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
            }
        } catch (e) {
            console.error('Failed to fetch leaderboard:', e);
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
            }
        } catch (e) {
            console.error('Failed to submit score:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    onMount(() => {
        fetchLeaderboard();
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
                }
            );
            game.start();

            onCleanup(() => {
                game.stop();
            });
        }
    });

    return (
        <div style={{ 
            position: 'relative', 
            'user-select': 'none',
            display: 'flex',
            'justify-content': 'center',
            'align-items': 'center',
            height: '100vh',
            background: '#222',
            'font-family': '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }}>
            <div style={{ position: 'relative', width: '400px', height: '600px', overflow: 'hidden', 'box-shadow': '0 0 20px rgba(0,0,0,0.5)' }}>
                {/* Score UI */}
                <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    'font-size': '64px',
                    'font-weight': '900',
                    'text-shadow': '4px 4px 0px #000',
                    'z-index': 10,
                    'pointer-events': 'none',
                    'font-family': '"Arial Black", sans-serif'
                }}>
                    {score()}
                </div>

                {/* High Score (Small) */}
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    color: 'white',
                    'font-size': '14px',
                    'font-weight': 'bold',
                    'text-shadow': '1px 1px 2px #000',
                    'z-index': 10,
                    'pointer-events': 'none'
                }}>
                    BEST: {highScore()}
                </div>

                {/* Game Over UI */}
                <Show when={gameState() === 'GAME_OVER'}>
                    <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        'flex-direction': 'column',
                        'justify-content': 'center',
                        'align-items': 'center',
                        color: 'white',
                        'z-index': 20,
                        'backdrop-filter': 'blur(6px)'
                    }}>
                        <div style={{
                            background: '#f39c12',
                            padding: '25px',
                            'border-radius': '15px',
                            'border': '4px solid white',
                            'text-align': 'center',
                            'box-shadow': '0 10px 25px rgba(0,0,0,0.4)',
                            width: '280px'
                        }}>
                            <h1 style={{ 'font-size': '28px', margin: '0 0 15px 0', 'text-shadow': '2px 2px 0 #d35400' }}>GAME OVER</h1>
                            
                            <div style={{ 'background': 'rgba(0,0,0,0.1)', 'padding': '10px', 'border-radius': '10px', 'margin-bottom': '15px' }}>
                                <div style={{ 'font-size': '18px' }}>SCORE: {score()}</div>
                                <div style={{ 'font-size': '14px', opacity: 0.8 }}>BEST: {highScore()}</div>
                            </div>

                            {/* Leaderboard Submission */}
                            <Show when={isTopScore() && !hasSubmitted()}>
                                <div style={{ 'margin-bottom': '20px', 'background': 'rgba(255,255,255,0.1)', 'padding': '10px', 'border-radius': '8px' }}>
                                    <div style={{ 'font-size': '12px', 'margin-bottom': '8px', 'font-weight': 'bold', color: '#2ecc71' }}>NEW HIGH SCORE!</div>
                                    <input 
                                        type="text" 
                                        placeholder="YOUR NAME" 
                                        value={userName()}
                                        onInput={(e) => setUserName(e.currentTarget.value.toUpperCase().slice(0, 8))}
                                        style={{
                                            padding: '8px',
                                            width: '120px',
                                            'border-radius': '5px',
                                            'border': 'none',
                                            'text-align': 'center',
                                            'font-weight': 'bold'
                                        }}
                                    />
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            submitScore();
                                        }}
                                        disabled={isSubmitting() || !userName()}
                                        style={{
                                            padding: '8px 15px',
                                            'margin-left': '5px',
                                            'background': '#2ecc71',
                                            'color': 'white',
                                            'border': 'none',
                                            'border-radius': '5px',
                                            'font-weight': 'bold',
                                            'cursor': 'pointer',
                                            opacity: isSubmitting() || !userName() ? 0.5 : 1
                                        }}
                                    >
                                        {isSubmitting() ? '...' : 'SEND'}
                                    </button>
                                </div>
                            </Show>

                            {/* Mini Leaderboard */}
                            <div style={{ 'text-align': 'left', 'font-size': '14px', 'background': 'rgba(255,255,255,0.1)', 'padding': '10px', 'border-radius': '8px' }}>
                                <div style={{ 'font-weight': 'bold', 'margin-bottom': '5px', 'border-bottom': '1px solid rgba(255,255,255,0.2)', 'padding-bottom': '3px' }}>
                                    TOP PLAYERS
                                </div>
                                <For each={leaderboard()}>
                                    {(entry, i) => (
                                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '2px' }}>
                                            <span>{i() + 1}. {entry.name}</span>
                                            <span style={{ 'font-weight': 'bold' }}>{entry.score}</span>
                                        </div>
                                    )}
                                </For>
                            </div>

                            <div style={{ 
                                'margin-top': '20px',
                                'font-size': '16px', 
                                'animation': 'pulse 1s infinite',
                                'background': 'white',
                                'color': '#f39c12',
                                'padding': '8px 15px',
                                'border-radius': '20px',
                                'font-weight': 'bold',
                                'cursor': 'pointer'
                            }}>
                                CLICK TO RESTART
                            </div>
                        </div>
                    </div>
                </Show>

                {/* Ready State Instructions */}
                <Show when={gameState() === 'READY'}>
                     <div style={{
                        position: 'absolute',
                        bottom: '100px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: 'white',
                        'font-size': '18px',
                        'text-align': 'center',
                        'text-shadow': '2px 2px 4px #000',
                        'animation': 'pulse 1.5s infinite'
                    }}>
                        PRESS SPACE OR CLICK TO JUMP
                    </div>
                </Show>

                <canvas ref={canvasRef} width="400" height="600" />
            </div>
            
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default App;
