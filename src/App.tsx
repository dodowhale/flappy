import { onMount, createSignal, Show } from 'solid-js';
import { Game, GameState } from './game/Game';

const App = () => {
    let canvasRef: HTMLCanvasElement | undefined;
    const [score, setScore] = createSignal(0);
    const [gameState, setGameState] = createSignal<GameState>('READY');

    onMount(() => {
        if (canvasRef) {
            const game = new Game(
                canvasRef, 
                (s) => setScore(s),
                (state) => setGameState(state)
            );
            game.start();
        }
    });

    return (
        <div style={{ position: 'relative', 'user-select': 'none' }}>
            {/* Score UI */}
            <div style={{
                position: 'absolute',
                top: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                'font-size': '48px',
                'font-weight': 'bold',
                'text-shadow': '3px 3px 0px #000',
                'z-index': 10,
                'pointer-events': 'none'
            }}>
                {score()}
            </div>

            {/* Game Over UI */}
            <Show when={gameState() === 'GAME_OVER'}>
                <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '400px',
                    height: '600px',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    'flex-direction': 'column',
                    'justify-content': 'center',
                    'align-items': 'center',
                    color: 'white',
                    'z-index': 20
                }}>
                    <h1 style={{ 'font-size': '40px', margin: '0' }}>GAME OVER</h1>
                    <p style={{ 'font-size': '20px' }}>Final Score: {score()}</p>
                    <p style={{ 'font-size': '16px', 'animation': 'pulse 1s infinite' }}>Click to Restart</p>
                </div>
            </Show>

            <canvas ref={canvasRef} width="400" height="600" />
            
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default App;
