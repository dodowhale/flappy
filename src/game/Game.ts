export type GameState = 'READY' | 'PLAYING' | 'GAME_OVER';

export class Bird {
    public x: number = 50;
    public y: number;
    public radius: number = 14;
    public velocity: number = 0;
    private gravity: number = 0.5;
    private jumpStrength: number = -7;
    private rotation: number = 0;

    constructor(canvasHeight: number) {
        this.y = canvasHeight / 2;
    }

    public update(canvasHeight: number) {
        this.velocity += this.gravity;
        this.y += this.velocity;
        
        // 회전 효과 (속도에 따라 머리 각도 조절)
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity / 10)));
    }

    public jump() {
        this.velocity = this.jumpStrength;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Body
        ctx.fillStyle = '#f7d02c';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Wing
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(-5, 2, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(7, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(9, -5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(20, 3);
        ctx.lineTo(12, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

export class Pipe {
    public x: number;
    public width: number = 52;
    public topHeight: number;
    public gap: number = 160;
    public passed: boolean = false;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.x = canvasWidth;
        this.topHeight = Math.random() * (canvasHeight - this.gap - 200) + 100;
    }

    public update(speed: number) {
        this.x -= speed;
    }

    public draw(ctx: CanvasRenderingContext2D, canvasHeight: number) {
        const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
        gradient.addColorStop(0, '#2ecc71');
        gradient.addColorStop(0.5, '#58d68d');
        gradient.addColorStop(1, '#27ae60');
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#1e8449';
        ctx.lineWidth = 2;
        
        // Top pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        ctx.strokeRect(this.x, 0, this.width, this.topHeight);
        // Top pipe lip
        ctx.fillRect(this.x - 4, this.topHeight - 20, this.width + 8, 20);
        ctx.strokeRect(this.x - 4, this.topHeight - 20, this.width + 8, 20);
        
        // Bottom pipe
        const bottomY = this.topHeight + this.gap;
        ctx.fillRect(this.x, bottomY, this.width, canvasHeight - bottomY);
        ctx.strokeRect(this.x, bottomY, this.width, canvasHeight - bottomY);
        // Bottom pipe lip
        ctx.fillRect(this.x - 4, bottomY, this.width + 8, 20);
        ctx.strokeRect(this.x - 4, bottomY, this.width + 8, 20);
    }

    public isOffScreen(): boolean {
        return this.x + this.width + 10 < 0;
    }
}

export class Game {
    private ctx: CanvasRenderingContext2D;
    private onScoreChange: (score: number) => void;
    private onStateChange: (state: GameState) => void;
    
    private score: number = 0;
    private state: GameState = 'READY';
    private animationId: number = 0;
    private lastTime: number = 0;

    private bird: Bird;
    private pipes: Pipe[] = [];
    private pipeSpawnTimer: number = 0;
    private pipeSpawnInterval: number = 1800;
    private gameSpeed: number = 2.5;

    constructor(
        canvas: HTMLCanvasElement, 
        onScoreChange: (score: number) => void,
        onStateChange: (state: GameState) => void
    ) {
        this.ctx = canvas.getContext('2d')!;
        this.onScoreChange = onScoreChange;
        this.onStateChange = onStateChange;
        this.bird = new Bird(this.ctx.canvas.height);
        
        window.addEventListener('keydown', this.handleInput);
        canvas.addEventListener('mousedown', this.handleInput);
    }

    private handleInput = (e?: KeyboardEvent | MouseEvent) => {
        if (e instanceof KeyboardEvent && e.code !== 'Space') return;
        
        if (this.state === 'READY') {
            this.state = 'PLAYING';
            this.onStateChange('PLAYING');
        }
        
        if (this.state === 'PLAYING') {
            this.bird.jump();
        } else if (this.state === 'GAME_OVER') {
            this.reset();
            this.state = 'PLAYING';
            this.onStateChange('PLAYING');
        }
    }

    private reset() {
        this.bird = new Bird(this.ctx.canvas.height);
        this.pipes = [];
        this.score = 0;
        this.onScoreChange(0);
        this.pipeSpawnTimer = 0;
    }

    public start() {
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    private checkCollision(): boolean {
        if (this.bird.y + this.bird.radius > this.ctx.canvas.height || this.bird.y - this.bird.radius < 0) {
            return true;
        }

        for (const pipe of this.pipes) {
            if (
                this.bird.x + this.bird.radius - 5 > pipe.x &&
                this.bird.x - this.bird.radius + 5 < pipe.x + pipe.width
            ) {
                if (
                    this.bird.y - this.bird.radius + 5 < pipe.topHeight ||
                    this.bird.y + this.bird.radius - 5 > pipe.topHeight + pipe.gap
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    private update(deltaTime: number) {
        if (this.state !== 'PLAYING') return;

        this.bird.update(this.ctx.canvas.height);

        if (this.checkCollision()) {
            this.state = 'GAME_OVER';
            this.onStateChange('GAME_OVER');
            return;
        }

        this.pipeSpawnTimer += deltaTime;
        if (this.pipeSpawnTimer > this.pipeSpawnInterval) {
            this.pipes.push(new Pipe(this.ctx.canvas.width, this.ctx.canvas.height));
            this.pipeSpawnTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i]!;
            pipe.update(this.gameSpeed);

            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.onScoreChange(this.score);
            }

            if (pipe.isOffScreen()) {
                this.pipes.splice(i, 1);
            }
        }
    }

    private draw() {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // Background Gradient
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#2980b9');
        skyGrad.addColorStop(1, '#6dd5fa');
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, width, height);

        // Clouds (Simple)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(100, 100, 30, 0, Math.PI * 2);
        this.ctx.arc(130, 100, 40, 0, Math.PI * 2);
        this.ctx.arc(160, 100, 30, 0, Math.PI * 2);
        this.ctx.fill();

        this.pipes.forEach(pipe => pipe.draw(this.ctx, height));
        this.bird.draw(this.ctx);

        if (this.state === 'READY') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(0, 0, width, height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 24px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CLICK TO FLY', width / 2, height / 2);
        }
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
