export class Bird {
    public x: number = 50;
    public y: number;
    public radius: number = 15;

    constructor(canvasHeight: number) {
        this.y = canvasHeight / 2;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#f7d02c';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class Pipe {
    public x: number;
    public width: number = 50;
    public topHeight: number;
    public gap: number = 150;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.x = canvasWidth;
        this.topHeight = Math.random() * (canvasHeight - this.gap - 100) + 50;
    }

    public draw(ctx: CanvasRenderingContext2D, canvasHeight: number) {
        ctx.fillStyle = '#2ecc71';
        // Top pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // Bottom pipe
        const bottomY = this.topHeight + this.gap;
        ctx.fillRect(this.x, bottomY, this.width, canvasHeight - bottomY);
    }
}

export class Game {
    private ctx: CanvasRenderingContext2D;
    private scoreCallback: (score: number) => void;
    private score: number = 0;
    private animationId: number = 0;
    private lastTime: number = 0;

    private bird: Bird;
    private pipes: Pipe[] = [];

    constructor(canvas: HTMLCanvasElement, onScoreChange: (score: number) => void) {
        this.ctx = canvas.getContext('2d')!;
        this.scoreCallback = onScoreChange;
        this.bird = new Bird(this.ctx.canvas.height);
    }

    public start() {
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    private update(deltaTime: number) {
        // deltaTime을 초 단위로 변환 (필요시)
        // const dt = deltaTime / 1000;
        
        // TODO: Physics will be added in Phase 3
    }

    private draw() {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // Background
        this.ctx.fillStyle = '#70c5ce';
        this.ctx.fillRect(0, 0, width, height);

        // Entities
        this.bird.draw(this.ctx);
        this.pipes.forEach(pipe => pipe.draw(this.ctx, height));

        // Instructions placeholder
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Phase 2: Loop & Scaffolding', width / 2, 40);
    }

    private loop = (currentTime: number) => {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }

    public stop() {
        cancelAnimationFrame(this.animationId);
    }
}
