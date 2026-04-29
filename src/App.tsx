import { onMount, createSignal, Show } from 'solid-js';
import { Game, GameState } from './game/Game';

const App = () => {
    let canvasRef: HTMLCanvasElement | undefined;
    const [score, setScore] = createSignal(0);
    const [highScore, setHighScore] = createSignal(
        Number(localStorage.getItem('flappy-high-score') || 0)
    );
    const [gameState, setGameState] = createSignal<GameState>('READY');

    onMount(() => {
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
                (state) => setGameState(state)
            );
            game.start();
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
            background: '#222'
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
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        'flex-direction': 'column',
                        'justify-content': 'center',
                        'align-items': 'center',
                        color: 'white',
                        'z-index': 20,
                        'backdrop-filter': 'blur(4px)'
                    }}>
                        <div style={{
                            background: '#f39c12',
                            padding: '30px',
                            'border-radius': '15px',
                            'border': '5px solid white',
                            'text-align': 'center',
                            'box-shadow': '0 10px 20px rgba(0,0,0,0.3)'
                        }}>
                            <h1 style={{ 'font-size': '32px', margin: '0 0 20px 0', 'text-shadow': '2px 2px 0 #d35400' }}>GAME OVER</h1>
                            <div style={{ 'font-size': '20px', 'margin-bottom': '10px' }}>SCORE: {score()}</div>
                            <div style={{ 'font-size': '20px', 'margin-bottom': '30px', 'font-weight': 'bold' }}>BEST: {highScore()}</div>
                            <div style={{ 
                                'font-size': '18px', 
                                'animation': 'pulse 1s infinite',
                                'background': 'white',
                                'color': '#f39c12',
                                'padding': '10px 20px',
                                'border-radius': '25px',
                                'font-weight': 'bold'
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
