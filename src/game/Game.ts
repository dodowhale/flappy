export class Game {
    private ctx: CanvasRenderingContext2D;
    private scoreCallback: (score: number) => void;
    private score: number = 0;
    private animationId: number = 0;

    constructor(canvas: HTMLCanvasElement, onScoreChange: (score: number) => void) {
        this.ctx = canvas.getContext('2d')!;
        this.scoreCallback = onScoreChange;
    }

    public start() {
        this.loop();
    }

    private update() {
        // TODO: 게임 물리 업데이트 로직 구현
    }

    private draw() {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // 기본 배경 그리기
        this.ctx.fillStyle = '#70c5ce';
        this.ctx.fillRect(0, 0, width, height);

        // 새 대역 (Place holder)
        this.ctx.fillStyle = '#f7d02c';
        this.ctx.beginPath();
        this.ctx.arc(50, height / 2, 20, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px sans-serif';
        this.ctx.fillText('Coming Soon...', width / 2 - 60, height / 2 + 50);
    }

    private loop = () => {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }

    public stop() {
        cancelAnimationFrame(this.animationId);
    }
}
