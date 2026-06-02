export type GameState = 'READY' | 'PLAYING' | 'GAME_OVER';

const GRAVITY = 0.42; // Slightly floating physics
const JUMP_STRENGTH = -7.2;
const PIPE_SPAWN_INTERVAL = 1700;
const GAME_SPEED = 2.6;

export interface Character {
    id: string;
    name: string;
    price: number;
    color: string;
    cheekColor: string;
    wingColor: string;
    beakColor: string;
    skillName: string;
    skillDesc: string;
    cooldown: number; // in milliseconds
}

export const CHARACTERS: Character[] = [
    {
        id: 'goldy',
        name: 'GOLDY',
        price: 0,
        color: '#ffcc00', // Gold yellow
        cheekColor: 'rgba(255, 102, 102, 0.65)',
        wingColor: '#ffffff',
        beakColor: '#ff9f43',
        skillName: 'COIN MAGNET',
        skillDesc: 'PASSIVE: COIN MAGNET RADIUS IS 1.5X WIDER',
        cooldown: 0
    },
    {
        id: 'cherry',
        name: 'CHERRY',
        price: 15,
        color: '#ff7675', // Strawberry pink
        cheekColor: 'rgba(255, 234, 167, 0.8)',
        wingColor: '#fff275',
        beakColor: '#ffeaa7',
        skillName: 'CANDY BLAST',
        skillDesc: 'ACTIVE: DESTROY ALL PIPES ON THE SCREEN (SHFT/S)',
        cooldown: 22000 // 22 seconds
    },
    {
        id: 'berry',
        name: 'BERRY',
        price: 30,
        color: '#74b9ff', // Blueberry blue
        cheekColor: 'rgba(255, 102, 102, 0.65)',
        wingColor: '#a29bfe',
        beakColor: '#fdcb6e',
        skillName: 'STAR SHIELD',
        skillDesc: 'ACTIVE: 3.5S SHIELD THAT BLOCKS 1 COLLISION (SHFT/S)',
        cooldown: 25000 // 25 seconds
    },
    {
        id: 'mango',
        name: 'MANGO',
        price: 45,
        color: '#ffeaa7', // Mango cream orange
        cheekColor: 'rgba(255, 102, 102, 0.70)',
        wingColor: '#ff9f43',
        beakColor: '#d63031',
        skillName: 'HONEY MAGNET',
        skillDesc: 'ACTIVE: ATTRACT ALL COINS FOR 5 SECONDS (SHFT/S)',
        cooldown: 16000 // 16 seconds
    }
];

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
        osc.frequency.setValueAtTime(220, this.ctx!.currentTime);
        osc.frequency.exponentialRampToValueAtTime(650, this.ctx!.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.08);
    }

    public playScore() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.ctx!.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, this.ctx!.currentTime + 0.15);
        gain.gain.setValueAtTime(0.04, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.15);
    }

    public playHit() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, this.ctx!.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx!.currentTime + 0.25);
        gain.gain.setValueAtTime(0.08, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.25);
    }

    public playCoin() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.ctx!.currentTime); // D5
        osc.frequency.setValueAtTime(880, this.ctx!.currentTime + 0.04); // A5
        gain.gain.setValueAtTime(0.03, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.12);
    }

    public playExplode() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(261.63, this.ctx!.currentTime); // C4
        osc.frequency.exponentialRampToValueAtTime(55, this.ctx!.currentTime + 0.35);
        gain.gain.setValueAtTime(0.12, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.35);
    }

    public playShieldBreak() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, this.ctx!.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.ctx!.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.2);
    }
}

interface BackgroundLayer {
    x: number;
    speed: number;
    color: string;
    amplitude: number;
    frequency: number;
    baseHeight: number;
}

interface GameParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    color: string;
    type: 'heart' | 'star' | 'bubble';
    rotation: number;
    rotSpeed: number;
}

// Helper to draw rounded rectangle
function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Helper to draw star shapes
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

// Helper to draw heart shapes
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.beginPath();
    ctx.moveTo(x, y + size / 4);
    ctx.quadraticCurveTo(x, y, x - size / 2, y);
    ctx.quadraticCurveTo(x - size, y, x - size, y + size / 3);
    ctx.quadraticCurveTo(x - size, y + size * 2/3, x, y + size);
    ctx.quadraticCurveTo(x + size, y + size * 2/3, x + size, y + size / 3);
    ctx.quadraticCurveTo(x + size, y, x + size / 2, y);
    ctx.quadraticCurveTo(x, y, x, y + size / 4);
    ctx.closePath();
}

export class Coin {
    public x: number;
    public y: number;
    public radius: number = 8.5;
    public collected: boolean = false;
    private bounceOffset: number = Math.random() * Math.PI * 2;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public update(speed: number, timeScale: number) {
        this.x -= speed * timeScale;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.collected) return;
        ctx.save();
        
        // Gentle hover float
        const bounce = Math.sin(performance.now() * 0.0053 + this.bounceOffset) * 4;
        ctx.translate(this.x, this.y + bounce);

        // Gold outer sweet shell
        ctx.fillStyle = '#fecb2f';
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 2.2;
        drawStar(ctx, 0, 0, 5, 8.5, 4.2);
        ctx.fill();
        ctx.stroke();

        // Little shimmer spark
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-2, -2, 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    public isOffScreen(): boolean {
        return this.x + this.radius + 20 < 0;
    }
}

export class Bird {
    public x: number = 80;
    public y: number;
    public radius: number = 16; 
    public velocity: number = 0;
    private rotation: number = 0;
    private wingAngle: number = 0;
    private wingFlapSpeed: number = 0.25;

    // Character status
    public characterId: string = 'goldy';
    public shieldActive: boolean = false;
    public magnetActive: boolean = false;

    constructor(canvasHeight: number) {
        this.y = canvasHeight / 2;
    }

    public update(timeScale: number, isReady: boolean = false) {
        if (isReady) {
            this.wingAngle += this.wingFlapSpeed * 0.65 * timeScale;
            this.velocity = 0;
            this.rotation = 0;
        } else {
            this.velocity += GRAVITY * timeScale;
            this.y += this.velocity * timeScale;
            this.wingAngle += this.wingFlapSpeed * timeScale;
            this.rotation = Math.min(Math.PI / 2.2, Math.max(-Math.PI / 5, (this.velocity * 0.08)));
        }
    }

    public jump() {
        this.velocity = JUMP_STRENGTH;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const char = CHARACTERS.find(c => c.id === this.characterId) || CHARACTERS[0]!;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Body Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.arc(2, 3, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 1. Tail Feathers
        ctx.fillStyle = char.beakColor;
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.arc(-this.radius + 3, 2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-this.radius + 2, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Main Body (Chubby colored sphere)
        const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, this.radius);
        bodyGrad.addColorStop(0, '#ffffff'); // Glare
        bodyGrad.addColorStop(0.2, char.color); 
        bodyGrad.addColorStop(1, this.darkenColor(char.color)); 
        ctx.fillStyle = bodyGrad;
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. Rosy Cheek
        ctx.fillStyle = char.cheekColor;
        ctx.beginPath();
        ctx.arc(this.radius / 2 - 2, this.radius / 3, 5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.radius / 2 + 2, -this.radius / 3.5, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(this.radius / 2 + 3.5, -this.radius / 3.5, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.radius / 2 + 2.5, -this.radius / 3.5 - 1.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.radius / 2 + 4.5, -this.radius / 3.5 + 1.2, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // 5. Wing
        ctx.save();
        ctx.translate(-this.radius / 3.5, this.radius / 6);
        const wingFlap = Math.sin(this.wingAngle) * 0.48;
        ctx.rotate(wingFlap);
        
        const wingGrad = ctx.createLinearGradient(-10, 0, 8, 0);
        wingGrad.addColorStop(0, '#ffffff');
        wingGrad.addColorStop(1, char.wingColor);
        ctx.fillStyle = wingGrad;
        
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 7, -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();

        // 6. Beak
        const beakGrad = ctx.createLinearGradient(this.radius - 3, 0, this.radius + 8, 0);
        beakGrad.addColorStop(0, char.beakColor);
        beakGrad.addColorStop(1, '#ff6b6b');
        ctx.fillStyle = beakGrad;
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.moveTo(this.radius - 2.5, -2);
        ctx.quadraticCurveTo(this.radius + 7, -1, this.radius + 7, 1);
        ctx.quadraticCurveTo(this.radius + 2, 4, this.radius - 1, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.radius - 1, 1);
        ctx.lineTo(this.radius + 5.5, 1);
        ctx.stroke();

        ctx.restore(); // Restore body translation/rotation

        // 7. Shield Aura
        if (this.shieldActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = '#74b9ff';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#74b9ff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();

            // Draw floating small stars on shield
            ctx.fillStyle = '#fff275';
            ctx.strokeStyle = '#4a2c00';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 0;
            const shieldTime = performance.now() * 0.004;
            for (let i = 0; i < 3; i++) {
                const angle = shieldTime + (i * Math.PI * 2 / 3);
                ctx.save();
                ctx.translate(Math.cos(angle) * (this.radius + 10), Math.sin(angle) * (this.radius + 10));
                drawStar(ctx, 0, 0, 5, 4.5, 2.2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        // 8. Magnet Aura
        if (this.magnetActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = '#ff9f43';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    private darkenColor(hex: string): string {
        if (hex.startsWith('rgba')) return hex;
        let c = hex.substring(1);
        let rgb = parseInt(c, 16);
        let r = (rgb >> 16) & 0xff;
        let g = (rgb >> 8) & 0xff;
        let b = (rgb >> 0) & 0xff;
        r = Math.max(0, Math.floor(r * 0.76));
        g = Math.max(0, Math.floor(g * 0.76));
        b = Math.max(0, Math.floor(b * 0.76));
        return `rgb(${r}, ${g}, ${b})`;
    }
}

export class Pipe {
    public x: number;
    public width: number = 66; 
    public topHeight: number;
    public passed: boolean = false;
    private themeColor: string;
    private vy: number = 0;

    constructor(canvasWidth: number, canvasHeight: number, gap: number, score: number) {
        this.x = canvasWidth;
        const minH = 60;
        const maxH = canvasHeight - gap - 120;
        this.topHeight = Math.random() * (maxH - minH) + minH;

        // Bouncing moving pipes starting at Phase 3 (score 13+)
        if (score >= 25) {
            this.vy = (Math.random() > 0.5 ? 1 : -1) * 1.25;
        } else if (score >= 13) {
            this.vy = (Math.random() > 0.5 ? 1 : -1) * 0.55;
        } else {
            this.vy = 0;
        }
        
        const pastelColors = ['#ff7675', '#0984e3', '#fdcb6e', '#6c5ce7', '#1dd1a1'];
        this.themeColor = pastelColors[Math.floor(Math.random() * pastelColors.length)]!;
    }

    public update(speed: number, timeScale: number, canvasHeight: number, gap: number) {
        this.x -= speed * timeScale;

        // Vertical movement with boundary bounce
        if (this.vy !== 0) {
            this.topHeight += this.vy * timeScale;
            const minH = 60;
            const maxH = canvasHeight - gap - 120;
            if (this.topHeight < minH) {
                this.topHeight = minH;
                this.vy = -this.vy;
            } else if (this.topHeight > maxH) {
                this.topHeight = maxH;
                this.vy = -this.vy;
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D, canvasHeight: number, gap: number) {
        const drawCandyPipe = (x: number, y: number, w: number, h: number, isTop: boolean) => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();

            ctx.fillStyle = '#fff9e6';
            ctx.fillRect(x, y, w, h);

            ctx.fillStyle = this.themeColor;
            const stripeWidth = 14;
            const spacing = 38;
            const angleOffset = isTop ? 1 : -1;
            
            for (let offset = -h - 50; offset < w + 50; offset += spacing) {
                ctx.beginPath();
                ctx.moveTo(x + offset, y);
                ctx.lineTo(x + offset + stripeWidth, y);
                ctx.lineTo(x + offset + (h * angleOffset) + stripeWidth, y + h);
                ctx.lineTo(x + offset + (h * angleOffset), y + h);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            ctx.strokeStyle = '#4a2c00'; 
            ctx.lineWidth = 3.5;
            ctx.strokeRect(x, y, w, h);

            const roundGrad = ctx.createLinearGradient(x, 0, x + w, 0);
            roundGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
            roundGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
            roundGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.04)');
            roundGrad.addColorStop(1, 'rgba(74, 44, 0, 0.22)');
            ctx.fillStyle = roundGrad;
            ctx.fillRect(x, y, w, h);

            const lipH = 26;
            const lipW = w + 12;
            const lipX = x - 6;
            const lipY = isTop ? y + h - lipH : y;
            
            ctx.fillStyle = this.themeColor;
            drawRoundedRect(ctx, lipX, lipY, lipW, lipH, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            drawRoundedRect(ctx, lipX + 3, lipY + 3, lipW - 6, lipH - 6, 6);
            ctx.fill();

            const lipGrad = ctx.createLinearGradient(lipX, 0, lipX + lipW, 0);
            lipGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            lipGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
            lipGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.05)');
            lipGrad.addColorStop(1, 'rgba(74, 44, 0, 0.25)');
            ctx.fillStyle = lipGrad;
            drawRoundedRect(ctx, lipX, lipY, lipW, lipH, 8);
            ctx.fill();

            const decorX = lipX + lipW / 2;
            const decorY = isTop ? lipY + lipH : lipY;
            ctx.save();
            ctx.translate(decorX, decorY);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#4a2c00';

            if (isTop) {
                ctx.fillStyle = '#fecb2f';
                drawStar(ctx, 0, 9, 5, 8, 4);
                ctx.fill();
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, 5);
                ctx.stroke();
            } else {
                ctx.fillStyle = '#ff7675';
                for (let a = 0; a < Math.PI * 2; a += Math.PI / 2.5) {
                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * 5.5, -9 + Math.sin(a) * 5.5, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.fillStyle = '#fecb2f';
                ctx.beginPath();
                ctx.arc(0, -9, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        };

        drawCandyPipe(this.x, 0, this.width, this.topHeight, true);
        const bottomY = this.topHeight + gap;
        drawCandyPipe(this.x, bottomY, this.width, canvasHeight - bottomY, false);
    }

    public isOffScreen(): boolean {
        return this.x + this.width + 30 < 0;
    }
}

export class Game {
    private ctx: CanvasRenderingContext2D;
    private onScoreChange: (score: number) => void;
    private onStateChange: (state: GameState) => void;
    private onCoinCollected: () => void;
    private onCooldownUpdate: (remaining: number, duration: number) => void;
    
    private score: number = 0;
    private state: GameState = 'READY';
    private animationId: number = 0;
    private lastTime: number = 0;

    private bird: Bird;
    private pipes: Pipe[] = [];
    private coins: Coin[] = [];
    private pipeSpawnTimer: number = 0;
    private audio: AudioManager = new AudioManager();
    private particles: GameParticle[] = [];

    // Active skills duration timers (in ms)
    private shieldDurationRemaining: number = 0;
    private magnetDurationRemaining: number = 0;
    private skillCooldownRemaining: number = 0;

    // Parallax Layers
    private bgLayers: BackgroundLayer[] = [];
    private groundX: number = 0;

    constructor(
        canvas: HTMLCanvasElement, 
        onScoreChange: (score: number) => void,
        onStateChange: (state: GameState) => void,
        onCoinCollected: () => void,
        onCooldownUpdate: (remaining: number, duration: number) => void
    ) {
        this.ctx = canvas.getContext('2d')!;
        this.onScoreChange = onScoreChange;
        this.onStateChange = onStateChange;
        this.onCoinCollected = onCoinCollected;
        this.onCooldownUpdate = onCooldownUpdate;
        
        this.bird = new Bird(this.ctx.canvas.height);
        this.initBackground();
        
        window.addEventListener('keydown', this.handleInput);
        canvas.addEventListener('mousedown', this.handleInput);
        canvas.addEventListener('touchstart', this.handleInput, { passive: false });
    }

    private initBackground() {
        this.bgLayers.push({
            x: 0,
            speed: 0.15,
            color: '#ebd4ef', 
            amplitude: 25,
            frequency: 0.005,
            baseHeight: 160
        });
        this.bgLayers.push({
            x: 0,
            speed: 0.45,
            color: '#a8e6cf', 
            amplitude: 38,
            frequency: 0.01,
            baseHeight: 110
        });
    }

    public setPlayerCharacter(characterId: string) {
        this.bird.characterId = characterId;
    }

    public useActiveSkill() {
        if (this.state !== 'PLAYING') return;
        if (this.skillCooldownRemaining > 0) return;

        const char = CHARACTERS.find(c => c.id === this.bird.characterId);
        if (!char || char.cooldown === 0) return; // passive or none

        if (char.id === 'cherry') {
            // Candy Blast - obliterate all current pipes with cute cherry heart explosion
            if (this.pipes.length > 0) {
                this.audio.playExplode();
                this.pipes.forEach(pipe => {
                    this.spawnParticleTrail(pipe.x + pipe.width / 2, this.ctx.canvas.height / 2, 14, true);
                });
                this.pipes = [];
            }
        } else if (char.id === 'berry') {
            // Star Shield
            this.bird.shieldActive = true;
            this.shieldDurationRemaining = 3500; // 3.5 seconds
            this.audio.playScore(); 
        } else if (char.id === 'mango') {
            // Honey Magnet
            this.bird.magnetActive = true;
            this.magnetDurationRemaining = 5000; // 5 seconds
            this.audio.playScore();
        }

        this.skillCooldownRemaining = char.cooldown;
    }

    private spawnParticleTrail(x: number, y: number, count: number = 1, isJump: boolean = false) {
        const types: ('heart' | 'star' | 'bubble')[] = ['heart', 'star', 'bubble'];
        const colors = isJump 
            ? ['#ffeaa7', '#ff7675', '#a29bfe', '#74b9ff', '#55efc4'] 
            : ['#ffffff', '#ffebf0', '#e8f5e9', '#e3f2fd'];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = isJump ? Math.random() * 2.8 + 1.2 : Math.random() * 0.8 + 0.2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: -this.currentSpeed - Math.cos(angle) * speed, 
                vy: isJump ? -Math.random() * 3 + 1.0 : (Math.random() - 0.5) * 1.0,
                size: isJump ? Math.random() * 8 + 6 : Math.random() * 5 + 3,
                alpha: 1.0,
                color: colors[Math.floor(Math.random() * colors.length)]!,
                type: types[Math.floor(Math.random() * types.length)]!,
                rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.15
            });
        }
    }

    private handleInput = (e?: KeyboardEvent | MouseEvent | TouchEvent) => {
        // Prevent game input when typing in input fields or clicking buttons
        if (e?.target instanceof HTMLInputElement || e?.target instanceof HTMLButtonElement) {
            return;
        }

        // Prevent browser double triggers (mousedown & touchstart at once) and scroll delays
        if (e && (e.type === 'touchstart' || e.type === 'mousedown')) {
            e.preventDefault();
        }

        // Active Skill Trigger (S key or Shift Key)
        if (e instanceof KeyboardEvent && (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyS' || e.code === 'KeyF')) {
            e.preventDefault();
            this.useActiveSkill();
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
            this.spawnParticleTrail(this.bird.x - 8, this.bird.y, 8, true);
        } else if (this.state === 'GAME_OVER') {
            this.reset();
            this.state = 'PLAYING';
            this.onStateChange('PLAYING');
            this.audio.playJump();
            this.spawnParticleTrail(this.bird.x - 8, this.bird.y, 8, true);
        }
    }

    private reset() {
        const prevCharId = this.bird.characterId;
        this.bird = new Bird(this.ctx.canvas.height);
        this.bird.characterId = prevCharId;
        
        this.pipes = [];
        this.coins = [];
        this.particles = [];
        this.score = 0;
        this.onScoreChange(0);
        this.pipeSpawnTimer = 0;
        
        this.shieldDurationRemaining = 0;
        this.magnetDurationRemaining = 0;
        this.skillCooldownRemaining = 0;
        this.onCooldownUpdate(0, 1);
    }

    public start() {
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    private checkCollision(): boolean {
        const canvasHeight = this.ctx.canvas.height;
        if (this.bird.y + this.bird.radius - 4 > canvasHeight - 42) {
            return true;
        }
        if (this.bird.y - this.bird.radius + 6 < 0) {
            return true;
        }

        const gap = this.currentGap;
        for (const pipe of this.pipes) {
            if (
                this.bird.x + this.bird.radius - 8 > pipe.x &&
                this.bird.x - this.bird.radius + 8 < pipe.x + pipe.width
            ) {
                if (
                    this.bird.y - this.bird.radius + 9 < pipe.topHeight ||
                    this.bird.y + this.bird.radius - 9 > pipe.topHeight + gap
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    private get currentSpeed(): number {
        // Dynamic speed based on score matrix phase
        if (this.score >= 25) return 3.5;
        if (this.score >= 13) return 3.2;
        if (this.score >= 6) return 2.9;
        return GAME_SPEED;
    }

    private get currentGap(): number {
        // Dynamic pipe gap based on score matrix phase
        if (this.score >= 25) return 125;
        if (this.score >= 13) return 135;
        if (this.score >= 6) return 145;
        return 155;
    }

    private update(deltaTime: number) {
        const timeScale = deltaTime / 16.67;
        const speed = this.state === 'GAME_OVER' ? 0 : this.currentSpeed;
        const gap = this.currentGap;

        // Update Backgrounds
        this.bgLayers.forEach(layer => {
            layer.x -= layer.speed * timeScale;
            if (layer.x <= -600) layer.x += 600;
        });
        
        this.groundX -= speed * timeScale;
        if (this.groundX <= -60) this.groundX += 60;

        // Update Skill / Buff remaining durations
        if (this.state === 'PLAYING') {
            if (this.shieldDurationRemaining > 0) {
                this.shieldDurationRemaining = Math.max(0, this.shieldDurationRemaining - deltaTime);
                if (this.shieldDurationRemaining === 0) {
                    this.bird.shieldActive = false;
                }
            }
            if (this.magnetDurationRemaining > 0) {
                this.magnetDurationRemaining = Math.max(0, this.magnetDurationRemaining - deltaTime);
                if (this.magnetDurationRemaining === 0) {
                    this.bird.magnetActive = false;
                }
            }
            if (this.skillCooldownRemaining > 0) {
                this.skillCooldownRemaining = Math.max(0, this.skillCooldownRemaining - deltaTime);
                const char = CHARACTERS.find(c => c.id === this.bird.characterId);
                const fullCd = char ? char.cooldown : 1;
                this.onCooldownUpdate(this.skillCooldownRemaining, fullCd);
            } else {
                this.onCooldownUpdate(0, 1);
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i]!;
            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.alpha -= 0.022 * timeScale;
            p.rotation += p.rotSpeed * timeScale;
            if (p.alpha <= 0 || p.size <= 0.5) {
                this.particles.splice(i, 1);
            }
        }

        if (this.state === 'READY') {
            this.bird.y = this.ctx.canvas.height / 2 + Math.sin(performance.now() * 0.0055) * 11;
            this.bird.update(timeScale, true);
            return;
        }

        // Magnet attraction simulation for Coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i]!;
            
            let pullSpeed = 0;
            let pullRadius = 0;

            if (this.bird.magnetActive) {
                pullSpeed = 7.5;
                pullRadius = 150;
            } else if (this.bird.characterId === 'goldy') {
                pullSpeed = 3.2;
                pullRadius = 60; // goldy has passive magnetic range
            }

            if (pullRadius > 0 && !coin.collected && this.state === 'PLAYING') {
                const dx = this.bird.x - coin.x;
                const dy = this.bird.y - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < pullRadius) {
                    const angle = Math.atan2(dy, dx);
                    coin.x += Math.cos(angle) * pullSpeed * timeScale;
                    coin.y += Math.sin(angle) * pullSpeed * timeScale;
                }
            }

            coin.update(speed, timeScale);

            // Collide with bird
            if (!coin.collected && this.state === 'PLAYING') {
                const dx = this.bird.x - coin.x;
                const dy = this.bird.y - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.bird.radius + coin.radius + 4) {
                    coin.collected = true;
                    this.coins.splice(i, 1);
                    
                    // Score coin!
                    this.audio.playCoin();
                    const totalCoins = Number(localStorage.getItem('flappy-candy-coins') || 0);
                    localStorage.setItem('flappy-candy-coins', String(totalCoins + 1));
                    this.onCoinCollected();
                    this.spawnParticleTrail(this.bird.x, this.bird.y, 5, true);
                    continue;
                }
            }

            if (coin.isOffScreen()) {
                this.coins.splice(i, 1);
            }
        }

        if (this.state !== 'PLAYING') return;

        this.bird.update(timeScale);

        if (Math.random() < 0.35) {
            this.spawnParticleTrail(this.bird.x - 12, this.bird.y + (Math.random() - 0.5) * 6, 1, false);
        }

        if (this.checkCollision()) {
            if (this.bird.shieldActive) {
                // Pop shield protection!
                this.bird.shieldActive = false;
                this.shieldDurationRemaining = 0;
                this.audio.playShieldBreak();
                this.spawnParticleTrail(this.bird.x, this.bird.y, 14, true);

                // Blow up colliding pipes
                for (let i = this.pipes.length - 1; i >= 0; i--) {
                    const pipe = this.pipes[i]!;
                    if (
                        this.bird.x + this.bird.radius - 8 > pipe.x &&
                        this.bird.x - this.bird.radius + 8 < pipe.x + pipe.width
                    ) {
                        this.pipes.splice(i, 1);
                    }
                }
            } else {
                this.state = 'GAME_OVER';
                this.onStateChange('GAME_OVER');
                this.audio.playHit();
                this.spawnParticleTrail(this.bird.x, this.bird.y, 16, true);
                return;
            }
        }

        this.pipeSpawnTimer += deltaTime;
        const baseInterval = Math.max(1100, PIPE_SPAWN_INTERVAL - (this.score * 18));
        if (this.pipeSpawnTimer > baseInterval) {
            const newPipe = new Pipe(this.ctx.canvas.width, this.ctx.canvas.height, gap, this.score);
            this.pipes.push(newPipe);
            this.pipeSpawnTimer = 0;

            // 45% chance to spawn star coin in the gap
            if (Math.random() < 0.45) {
                const coinY = newPipe.topHeight + gap / 2;
                this.coins.push(new Coin(this.ctx.canvas.width + newPipe.width / 2, coinY));
            }
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i]!;
            pipe.update(speed, timeScale, this.ctx.canvas.height, gap);

            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.onScoreChange(this.score);
                this.audio.playScore();
                this.spawnParticleTrail(pipe.x + pipe.width / 2, this.bird.y, 6, true);
            }

            if (pipe.isOffScreen()) {
                this.pipes.splice(i, 1);
            }
        }
    }

    private draw() {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);
        const gap = this.currentGap;

        // 1. Sky Gradient
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#ffccdf'); 
        skyGrad.addColorStop(0.4, '#ffeef4'); 
        skyGrad.addColorStop(0.8, '#dff9fb'); 
        skyGrad.addColorStop(1, '#a2e8dd'); 
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, width, height);

        // 2. Parallax Hills
        this.bgLayers.forEach((layer, index) => {
            this.ctx.fillStyle = layer.color;

            if (index === 0) { // Clouds
                for (let i = 0; i < 3; i++) {
                    const x = (layer.x + i * 280) % (width + 200) - 80;
                    this.drawCuteCloud(x + 40, 80, 0.85);
                    this.drawCuteCloud(x + 180, 140, 0.65);
                }

                this.ctx.beginPath();
                this.ctx.moveTo(0, height);
                for (let px = 0; px <= width + 10; px += 8) {
                    const py = height - layer.baseHeight - Math.sin((px - layer.x) * layer.frequency) * layer.amplitude;
                    this.ctx.lineTo(px, py);
                }
                this.ctx.lineTo(width, height);
                this.ctx.closePath();
                this.ctx.fill();
            } else { // Hills
                this.ctx.beginPath();
                this.ctx.moveTo(0, height);
                for (let px = 0; px <= width + 10; px += 8) {
                    const py = height - layer.baseHeight - Math.sin((px - layer.x) * layer.frequency) * layer.amplitude;
                    this.ctx.lineTo(px, py);
                }
                this.ctx.lineTo(width, height);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.fillStyle = '#ff7675';
                for (let i = 0; i < 4; i++) {
                    const hillX = (layer.x + i * 160) % (width + 60) - 20;
                    const hillY = height - layer.baseHeight - Math.sin((hillX - layer.x) * layer.frequency) * layer.amplitude;
                    this.ctx.fillRect(hillX, hillY - 8, 4, 8); 
                    this.ctx.beginPath();
                    this.ctx.arc(hillX + 2, hillY - 8, 5, Math.PI, 0); 
                    this.ctx.fill();
                }
            }
        });

        // 3. Coins
        this.coins.forEach(coin => coin.draw(this.ctx));

        // 4. Pipes
        this.pipes.forEach(pipe => pipe.draw(this.ctx, height, gap));

        // 5. Particles
        this.drawParticles();

        // 6. Ground
        this.drawGround(width, height);

        // 7. Bird
        this.bird.draw(this.ctx);

        // 8. Ready text
        if (this.state === 'READY') {
            this.ctx.fillStyle = 'rgba(26, 26, 36, 0.45)';
            this.ctx.fillRect(0, 0, width, height);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 36px "Fredoka", "Arial Black", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 8;
            this.ctx.fillText('SWEET FLAPPY', width / 2, height / 2 - 25);
            
            this.ctx.font = 'bold 15px "Nunito", sans-serif';
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#ffeaa7';
            this.ctx.fillText('🍭 TAP OR SPACE TO JUMP 🍭', width / 2, height / 2 + 25);
        }
    }

    private drawCuteCloud(x: number, y: number, scale: number) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 18 * scale, 0, Math.PI * 2);
        this.ctx.arc(x + 22 * scale, y - 4 * scale, 24 * scale, 0, Math.PI * 2);
        this.ctx.arc(x + 44 * scale, y, 16 * scale, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#7f8c8d';
        this.ctx.lineWidth = 1.8 * scale;
        this.ctx.lineCap = 'round';

        this.ctx.beginPath();
        this.ctx.arc(x + 22 * scale, y + 4 * scale, 4 * scale, 0, Math.PI);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(x + 13 * scale, y - 1 * scale, 2.5 * scale, Math.PI, 0);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(x + 31 * scale, y - 1 * scale, 2.5 * scale, Math.PI, 0);
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(255, 186, 186, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(x + 8 * scale, y + 4 * scale, 3 * scale, 0, Math.PI * 2);
        this.ctx.arc(x + 36 * scale, y + 4 * scale, 3 * scale, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    private drawParticles() {
        this.ctx.save();
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.strokeStyle = p.color;

            if (p.type === 'heart') {
                drawHeart(this.ctx, 0, -p.size/2, p.size);
                this.ctx.fill();
            } else if (p.type === 'star') {
                drawStar(this.ctx, 0, 0, 5, p.size, p.size / 2);
                this.ctx.fill();
            } else { 
                this.ctx.lineWidth = 1.2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size / 2.2, 0, Math.PI * 2);
                this.ctx.stroke();
                
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                this.ctx.beginPath();
                this.ctx.arc(-p.size / 6, -p.size / 6, p.size / 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        });
        this.ctx.restore();
    }

    private drawGround(width: number, height: number) {
        const groundHeight = 42;
        const groundY = height - groundHeight;

        this.ctx.fillStyle = '#b8e994'; 
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        for (let x = 0; x <= width + 20; x += 14) {
            const bump = Math.sin((x - this.groundX) * 0.12) * 3.8;
            this.ctx.lineTo(x, groundY + bump);
        }
        this.ctx.lineTo(width, height);
        this.ctx.lineTo(0, height);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = '#ffeaa7'; 
        this.ctx.fillRect(0, groundY + 8, width, groundHeight - 8);

        this.ctx.strokeStyle = '#4a2c00';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY + 8);
        this.ctx.lineTo(width, groundY + 8);
        this.ctx.stroke();

        this.ctx.fillStyle = '#eccc68'; 
        for (let i = -1; i < width / 25 + 2; i++) {
            const x = (this.groundX + i * 25) % (width + 50);
            this.ctx.beginPath();
            this.ctx.arc(x + 5, groundY + 18, 2.0, 0, Math.PI * 2);
            this.ctx.arc(x + 16, groundY + 28, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.fillStyle = '#ff7675'; 
        const flowerY = groundY + 2;
        for (let i = -1; i < width / 55 + 2; i++) {
            const x = this.groundX + i * 55;
            const wave = Math.sin(x * 0.12) * 3.8;
            const fy = flowerY + wave - 1;
            
            this.ctx.beginPath();
            this.ctx.arc(x - 3.2, fy, 2.5, 0, Math.PI * 2);
            this.ctx.arc(x + 3.2, fy, 2.5, 0, Math.PI * 2);
            this.ctx.arc(x, fy - 3.2, 2.5, 0, Math.PI * 2);
            this.ctx.arc(x, fy + 3.2, 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = '#fecb2f';
            this.ctx.beginPath();
            this.ctx.arc(x, fy, 1.6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#ff7675';
        }
    }

    private loop = (currentTime: number) => {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(Math.min(deltaTime, 100));
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }

    public restartGame() {
        if (this.state === 'GAME_OVER') {
            this.reset();
            this.state = 'PLAYING';
            this.onStateChange('PLAYING');
            this.audio.playJump();
            this.spawnParticleTrail(this.bird.x - 8, this.bird.y, 8, true);
        }
    }

    public stop() {
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('keydown', this.handleInput);
        this.ctx.canvas.removeEventListener('mousedown', this.handleInput);
        this.ctx.canvas.removeEventListener('touchstart', this.handleInput);
    }
}
