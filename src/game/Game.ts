export class Bird {
    public x: number = 50;
    public y: number;
    public radius: number = 15;
    public velocity: number = 0;
    private gravity: number = 0.6;
    private jumpStrength: number = -8;

    constructor(canvasHeight: number) {
        this.y = canvasHeight / 2;
    }

    public update(canvasHeight: number) {
        this.velocity += this.gravity;
        this.y += this.velocity;

        // 바닥 충돌 처리
        if (this.y + this.radius > canvasHeight) {
            this.y = canvasHeight - this.radius;
            this.velocity = 0;
        }
        // 천장 충돌 처리
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    }

    public jump() {
        this.velocity = this.jumpStrength;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#f7d02c';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 눈 그리기 (방향성 표현)
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y - 5, 3, 0, Math.PI * 2);
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
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
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
        
        // 입력 이벤트 리스너 등록
        window.addEventListener('keydown', this.handleInput);
        canvas.addEventListener('mousedown', this.handleInput);
    }

    private handleInput = (e?: KeyboardEvent | MouseEvent) => {
        if (e instanceof KeyboardEvent && e.code !== 'Space') return;
        this.bird.jump();
    }

    public start() {
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    private update(deltaTime: number) {
        this.bird.update(this.ctx.canvas.height);
    }

    private draw() {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);

        this.ctx.fillStyle = '#70c5ce';
        this.ctx.fillRect(0, 0, width, height);

        this.bird.draw(this.ctx);
        this.pipes.forEach(pipe => pipe.draw(this.ctx, height));
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
        window.removeEventListener('keydown', this.handleInput);
        this.ctx.canvas.removeEventListener('mousedown', this.handleInput);
    }
}
