import { onMount, createSignal } from 'solid-js';
import { Game } from './game/Game';

const App = () => {
    let canvasRef: HTMLCanvasElement | undefined;
    const [score, setScore] = createSignal(0);

    onMount(() => {
        if (canvasRef) {
            const game = new Game(canvasRef, (newScore) => setScore(newScore));
            game.start();
        }
    });

    return (
        <div style={{ position: 'relative' }}>
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                'font-size': '24px',
                'text-shadow': '2px 2px 4px rgba(0,0,0,0.5)',
                'pointer-events': 'none'
            }}>
                Score: {score()}
            </div>
            <canvas ref={canvasRef} width="400" height="600" />
        </div>
    );
};

export default App;
