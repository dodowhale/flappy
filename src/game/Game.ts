export type GameState = 'READY' | 'PLAYING' | 'GAME_OVER';

const GRAVITY = 0.45;
const JUMP_STRENGTH = -7.5;
const PIPE_SPAWN_INTERVAL = 1600;
const GAME_SPEED = 2.8;
const PIPE_GAP = 150;

class AudioManager {
    private ctx: AudioContext | null = null;

    private init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    public playJump() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, this.ctx!.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx!.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.1);
    }

    public playScore() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx!.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx!.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.2);
    }

    public playHit() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx!.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx!.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.3);
    }
}

interface BackgroundLayer {
    x: number;
    speed: number;
    color: string;
    heights: number[];
}

export class Bird {
    public x: number = 70;
    public y: number;
    public radius: number = 14;
    public velocity: number = 0;
    private rotation: number = 0;
    private wingAngle: number = 0;

    constructor(canvasHeight: number) {
        this.y = canvasHeight / 2;
    }

    public update(timeScale: number) {
        this.velocity += GRAVITY * timeScale;
        this.y += this.velocity * timeScale;
        
        // Wing animation based on velocity
        this.wingAngle += 0.2 * timeScale;
        
        // Rotation effect (angle head up when jumping, down when falling)
        this.rotation = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
    }

    public jump() {
        this.velocity = JUMP_STRENGTH;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Body Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(2, 2, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Main Body
        const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius);
        bodyGrad.addColorStop(0, '#f1c40f');
        bodyGrad.addColorStop(1, '#f39c12');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#964b00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Wing
        ctx.save();
        ctx.translate(-5, 2);
        const wingFlap = Math.sin(this.wingAngle) * 0.5;
        ctx.rotate(wingFlap);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(7, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(9, -6, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(12, -2);
        ctx.lineTo(22, 2);
        ctx.lineTo(12, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

export class Pipe {
    public x: number;
    public width: number = 60;
    public topHeight: number;
    public passed: boolean = false;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.x = canvasWidth;
        // Ensure some minimum and maximum height
        const minH = 50;
        const maxH = canvasHeight - PIPE_GAP - 100;
        this.topHeight = Math.random() * (maxH - minH) + minH;
    }

    public update(speed: number, timeScale: number) {
        this.x -= speed * timeScale;
    }

    public draw(ctx: CanvasRenderingContext2D, canvasHeight: number) {
        const drawPipeSegment = (x: number, y: number, w: number, h: number, isTop: boolean) => {
            const grad = ctx.createLinearGradient(x, 0, x + w, 0);
            grad.addColorStop(0, '#2ecc71');
            grad.addColorStop(0.3, '#a2f1c1');
            grad.addColorStop(0.5, '#27ae60');
            grad.addColorStop(1, '#1e8449');
            
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#0e4d2a';
            ctx.lineWidth = 3;
            
            // Body
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            
            // Vertical highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 5, y, 4, h);
            
            // Lip
            const lipH = 24;
            const lipW = w + 10;
            const lipX = x - 5;
            const lipY = isTop ? y + h - lipH : y;
            
            ctx.fillStyle = grad;
            ctx.fillRect(lipX, lipY, lipW, lipH);
            ctx.strokeRect(lipX, lipY, lipW, lipH);
            
            // Lip vertical highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(lipX + 5, lipY, 4, lipH);
        };

        drawPipeSegment(this.x, 0, this.width, this.topHeight, true);
        const bottomY = this.topHeight + PIPE_GAP;
        drawPipeSegment(this.x, bottomY, this.width, canvasHeight - bottomY, false);
    }

    public isOffScreen(): boolean {
        return this.x + this.width + 20 < 0;
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
    private audio: AudioManager = new AudioManager();

    // Parallax Layers
    private bgLayers: BackgroundLayer[] = [];
    private groundX: number = 0;

    constructor(
        canvas: HTMLCanvasElement, 
        onScoreChange: (score: number) => void,
        onStateChange: (state: GameState) => void
    ) {
        this.ctx = canvas.getContext('2d')!;
        this.onScoreChange = onScoreChange;
        this.onStateChange = onStateChange;
        this.bird = new Bird(this.ctx.canvas.height);
        
        this.initBackground();
        
        window.addEventListener('keydown', this.handleInput);
        canvas.addEventListener('mousedown', this.handleInput);
    }

    private initBackground() {
        // Distant Clouds
        this.bgLayers.push({
            x: 0,
            speed: 0.2,
            color: 'rgba(255, 255, 255, 0.4)',
            heights: Array.from({length: 10}, () => Math.random() * 50 + 50)
        });
        // Distant Buildings/Hills
        this.bgLayers.push({
            x: 0,
            speed: 0.8,
            color: '#34495e',
            heights: Array.from({length: 20}, () => Math.random() * 100 + 100)
        });
    }

    private handleInput = (e?: KeyboardEvent | MouseEvent) => {
        // Prevent game input when typing in input fields or clicking buttons
        if (e?.target instanceof HTMLInputElement || e?.target instanceof HTMLButtonElement) {
            return;
        }

        if (e instanceof KeyboardEvent && e.code !== 'Space') return;
        
        if (this.state === 'READY') {
            this.state = 'PLAYING';
            this.onStateChange('PLAYING');
        }
        
        if (this.state === 'PLAYING') {
            this.bird.jump();
            this.audio.playJump();
        } else if (this.state === 'GAME_OVER') {
            // Only restart if it's been a moment since game over to avoid accidental restarts
            this.reset();
            this.state = 'PLAYING';
            this.onStateChange('PLAYING');
            this.audio.playJump();
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
        const canvasHeight = this.ctx.canvas.height;
        // Ground or Ceiling
        if (this.bird.y + this.bird.radius - 5 > canvasHeight - 40 || this.bird.y - this.bird.radius + 5 < 0) {
            return true;
        }

        for (const pipe of this.pipes) {
            if (
                this.bird.x + this.bird.radius - 8 > pipe.x &&
                this.bird.x - this.bird.radius + 8 < pipe.x + pipe.width
            ) {
                if (
                    this.bird.y - this.bird.radius + 8 < pipe.topHeight ||
                    this.bird.y + this.bird.radius - 8 > pipe.topHeight + PIPE_GAP
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    private get currentSpeed(): number {
        // Difficulty scaling: speed increases every 5 points
        return GAME_SPEED + Math.floor(this.score / 5) * 0.2;
    }

    private update(deltaTime: number) {
        const timeScale = deltaTime / 16.67;
        const speed = this.state === 'GAME_OVER' ? 0 : this.currentSpeed;

        // Update Background (Seamless looping)
        this.bgLayers.forEach(layer => {
            layer.x -= layer.speed * timeScale;
            if (layer.x <= -400) layer.x += 400;
        });
        this.groundX -= speed * timeScale;
        if (this.groundX <= -40) this.groundX += 40;

        if (this.state !== 'PLAYING') return;

        this.bird.update(timeScale);

        if (this.checkCollision()) {
            this.state = 'GAME_OVER';
            this.onStateChange('GAME_OVER');
            this.audio.playHit();
            return;
        }

        this.pipeSpawnTimer += deltaTime;
        // Interval decreases as speed increases
        const spawnInterval = Math.max(1000, PIPE_SPAWN_INTERVAL - (this.score * 20));
        if (this.pipeSpawnTimer > spawnInterval) {
            this.pipes.push(new Pipe(this.ctx.canvas.width, this.ctx.canvas.height));
            this.pipeSpawnTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i]!;
            pipe.update(speed, timeScale);

            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.onScoreChange(this.score);
                this.audio.playScore();
            }

            if (pipe.isOffScreen()) {
                this.pipes.splice(i, 1);
            }
        }
    }

    private draw() {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // 1. Sky Gradient
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#2980b9');
        skyGrad.addColorStop(1, '#6dd5fa');
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, width, height);

        // 2. Background Layers (Parallax)
        this.bgLayers.forEach((layer, index) => {
            this.ctx.fillStyle = layer.color;
            if (index === 0) { // Clouds
                for (let i = 0; i < 3; i++) {
                    const x = layer.x + i * 400;
                    this.drawCloud(x + 50, 100);
                    this.drawCloud(x + 250, 150);
                    this.drawCloud(x + 100, 250);
                }
            } else { // Distant Buildings
                const buildingWidth = 40;
                for (let i = -1; i < width / buildingWidth + 10; i++) {
                    const x = layer.x + i * buildingWidth;
                    const h = layer.heights[i % layer.heights.length]!;
                    this.ctx.fillRect(x, height - h - 40, buildingWidth - 2, h);
                    // Windows
                    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    this.ctx.fillRect(x + 5, height - h - 20, 10, 10);
                    this.ctx.fillStyle = layer.color;
                }
            }
        });

        // 3. Pipes
        this.pipes.forEach(pipe => pipe.draw(this.ctx, height));

        // 4. Ground
        this.drawGround(width, height);

        // 5. Bird
        this.bird.draw(this.ctx);

        if (this.state === 'READY') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.fillRect(0, 0, width, height);
            
            // Welcome Text
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 32px "Arial Black", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'black';
            this.ctx.shadowBlur = 10;
            this.ctx.fillText('FLAPPY BIRD', width / 2, height / 2 - 20);
            
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.shadowBlur = 0;
            this.ctx.fillText('CLICK OR SPACE TO START', width / 2, height / 2 + 30);
        }
    }

    private drawCloud(x: number, y: number) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2);
        this.ctx.arc(x + 25, y, 30, 0, Math.PI * 2);
        this.ctx.arc(x + 55, y, 20, 0, Math.PI * 2);
        this.ctx.fill();
    }

    private drawGround(width: number, height: number) {
        const groundHeight = 40;
        const groundY = height - groundHeight;

        // Grass Top
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillRect(0, groundY, width, 10);
        
        // Dirt Bottom
        this.ctx.fillStyle = '#d35400';
        this.ctx.fillRect(0, groundY + 10, width, groundHeight - 10);

        // Ground Pattern (moving)
        this.ctx.strokeStyle = '#e67e22';
        this.ctx.lineWidth = 2;
        for (let i = -1; i < width / 20 + 2; i++) {
            const x = this.groundX + i * 20;
            this.ctx.beginPath();
            this.ctx.moveTo(x, groundY + 10);
            this.ctx.lineTo(x - 10, height);
            this.ctx.stroke();
        }
    }

    private loop = (currentTime: number) => {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(Math.min(deltaTime, 100));
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }

    public stop() {
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('keydown', this.handleInput);
        this.ctx.canvas.removeEventListener('mousedown', this.handleInput);
    }
}
