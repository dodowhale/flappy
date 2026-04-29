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

        if (this.y + this.radius > canvasHeight) {
            this.y = canvasHeight - this.radius;
            this.velocity = 0;
        }
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
    public passed: boolean = false;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.x = canvasWidth;
        this.topHeight = Math.random() * (canvasHeight - this.gap - 150) + 50;
    }

    public update(speed: number) {
        this.x -= speed;
    }

    public draw(ctx: CanvasRenderingContext2D, canvasHeight: number) {
        ctx.fillStyle = '#2ecc71';
        // Top pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // Bottom pipe
        const bottomY = this.topHeight + this.gap;
        ctx.fillRect(this.x, bottomY, this.width, canvasHeight - bottomY);
    }

    public isOffScreen(): boolean {
        return this.x + this.width < 0;
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
    private pipeSpawnTimer: number = 0;
    private pipeSpawnInterval: number = 1500; // 1.5초마다 생성
    private gameSpeed: number = 3;

    constructor(canvas: HTMLCanvasElement, onScoreChange: (score: number) => void) {
        this.ctx = canvas.getContext('2d')!;
        this.scoreCallback = onScoreChange;
        this.bird = new Bird(this.ctx.canvas.height);
        
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

        // 파이프 생성 로직
        this.pipeSpawnTimer += deltaTime;
        if (this.pipeSpawnTimer > this.pipeSpawnInterval) {
            this.pipes.push(new Pipe(this.ctx.canvas.width, this.ctx.canvas.height));
            this.pipeSpawnTimer = 0;
        }

        // 파이프 업데이트 및 제거
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i]!;
            pipe.update(this.gameSpeed);

            if (pipe.isOffScreen()) {
                this.pipes.splice(i, 1);
            }
        }
    }

    private draw() {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);

        this.ctx.fillStyle = '#70c5ce';
        this.ctx.fillRect(0, 0, width, height);

        this.pipes.forEach(pipe => pipe.draw(this.ctx, height));
        this.bird.draw(this.ctx);
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
