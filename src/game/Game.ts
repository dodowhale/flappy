export type GameState = 'READY' | 'PLAYING' | 'GAME_OVER' | 'BOSS_FIGHT';

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
        skillDesc: 'PASSIVE: 상시 코인 자석 범위 확대 (90px)',
        cooldown: 0
    },
    {
        id: 'cherry',
        name: 'CHERRY',
        price: 20,
        color: '#ff7675', // Strawberry pink
        cheekColor: 'rgba(255, 234, 167, 0.8)',
        wingColor: '#fff275',
        beakColor: '#ffeaa7',
        skillName: 'CANDY BLAST',
        skillDesc: 'ACTIVE: 화면 내 모든 파이프 파괴 및 보너스 (S/Shift)',
        cooldown: 22000
    },
    {
        id: 'berry',
        name: 'BERRY',
        price: 40,
        color: '#74b9ff', // Blueberry blue
        cheekColor: 'rgba(255, 102, 102, 0.65)',
        wingColor: '#a29bfe',
        beakColor: '#fdcb6e',
        skillName: 'STAR SHIELD',
        skillDesc: 'ACTIVE: 4.5초 보호막 생성, 충돌 1회 무시 (S/Shift)',
        cooldown: 24000
    },
    {
        id: 'mango',
        name: 'MANGO',
        price: 60,
        color: '#ffeaa7', // Mango cream orange
        cheekColor: 'rgba(255, 102, 102, 0.70)',
        wingColor: '#ff9f43',
        beakColor: '#d63031',
        skillName: 'HONEY RUSH',
        skillDesc: 'ACTIVE: 1.5초간 무적 돌진 & 자석 흡입 (S/Shift)',
        cooldown: 18000
    },
    {
        id: 'plum',
        name: 'PLUM',
        price: 80,
        color: '#9c27b0', // Plum purple
        cheekColor: 'rgba(255, 118, 117, 0.65)',
        wingColor: '#e040fb',
        beakColor: '#feca57',
        skillName: 'JUICY FEVER',
        skillDesc: 'ACTIVE: 즉시 5초간 피버 모드 & 코인 2배 (S/Shift)',
        cooldown: 26000
    }
];

class AudioManager {
    private ctx: AudioContext | null = null;
    private schedulerIntervalId: any = null;
    private nextNoteTime: number = 0.0;
    private currentNoteIndex: number = 0;
    private bpm: number = 135;
    private bgmEnabled: boolean = true;
    private bgmActive: boolean = false;
    private speedFactor: number = 1.0;
    private feverActive: boolean = false;

    // C Major/Pentatonic scale casual 8-bit retro loops
    private melody: number[] = [
        261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66,
        329.63, 392.00, 440.00, 523.25, 440.00, 523.25, 587.33, 659.25
    ];
    
    private bass: number[] = [
        130.81, 130.81, 164.81, 164.81, 220.00, 220.00, 174.61, 174.61
    ];

    private init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const stored = localStorage.getItem('flappy-bgm-enabled');
            this.bgmEnabled = stored !== 'false';
        }
    }

    public toggleBGM(enabled: boolean) {
        this.bgmEnabled = enabled;
        localStorage.setItem('flappy-bgm-enabled', String(enabled));
        if (!enabled) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
    }

    public updateBGMTempo(speedFactor: number, feverActive: boolean) {
        this.speedFactor = speedFactor;
        this.feverActive = feverActive;
        this.bpm = 135 * speedFactor * (feverActive ? 1.25 : 1.0);
    }

    public startBGM() {
        this.init();
        if (!this.bgmEnabled) return;
        if (this.bgmActive) return;

        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
        
        this.bgmActive = true;
        this.nextNoteTime = this.ctx!.currentTime;
        this.currentNoteIndex = 0;

        // 50ms check interval, lookahead scheduling
        this.schedulerIntervalId = setInterval(() => {
            this.scheduler();
        }, 50);
    }

    private scheduler() {
        if (!this.ctx) return;
        const lookahead = 0.2; // 200ms lookahead
        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            this.scheduleNote(this.currentNoteIndex, this.nextNoteTime);
            this.advanceNote();
        }
    }

    private advanceNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        // 8th notes (0.5 beats)
        this.nextNoteTime += 0.5 * secondsPerBeat;
        this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;
    }

    private scheduleNote(index: number, time: number) {
        if (!this.ctx) return;

        const isFever = this.feverActive;
        let freq = this.melody[index]! * (isFever ? 2.0 : 1.0);
        
        // 1. Lead Melody Note (Square Wave)
        const oscMelody = this.ctx.createOscillator();
        const gainMelody = this.ctx.createGain();
        
        oscMelody.type = 'square';
        oscMelody.frequency.setValueAtTime(freq, time);
        
        gainMelody.gain.setValueAtTime(0.0, time);
        gainMelody.gain.linearRampToValueAtTime(isFever ? 0.032 : 0.022, time + 0.015);
        gainMelody.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
        
        oscMelody.connect(gainMelody);
        gainMelody.connect(this.ctx.destination);
        
        oscMelody.start(time);
        oscMelody.stop(time + 0.24);

        // 2. Bass note (Triangle Wave, once every 2 notes)
        if (index % 2 === 0) {
            const bassIndex = Math.floor(index / 2) % this.bass.length;
            const bassFreq = this.bass[bassIndex]!;
            
            const oscBass = this.ctx.createOscillator();
            const gainBass = this.ctx.createGain();
            
            oscBass.type = 'triangle';
            oscBass.frequency.setValueAtTime(bassFreq, time);
            
            gainBass.gain.setValueAtTime(0.0, time);
            gainBass.gain.linearRampToValueAtTime(0.045, time + 0.02);
            gainBass.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
            
            oscBass.connect(gainBass);
            gainBass.connect(this.ctx.destination);
            
            oscBass.start(time);
            oscBass.stop(time + 0.48);

            // Clean up Bass Nodes after playing to prevent memory leak
            setTimeout(() => {
                oscBass.disconnect();
                gainBass.disconnect();
            }, (time - this.ctx!.currentTime + 0.6) * 1000);
        }

        // Clean up Lead Melody Nodes after playing to prevent memory leak
        setTimeout(() => {
            oscMelody.disconnect();
            gainMelody.disconnect();
        }, (time - this.ctx!.currentTime + 0.35) * 1000);
    }

    public stopBGM() {
        this.bgmActive = false;
        if (this.schedulerIntervalId) {
            clearInterval(this.schedulerIntervalId);
            this.schedulerIntervalId = null;
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

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 150);
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

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 220);
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

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 320);
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

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 200);
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

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 450);
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

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 300);
    }

    public playSlow() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, this.ctx!.currentTime);
        osc.frequency.linearRampToValueAtTime(110, this.ctx!.currentTime + 0.35);
        gain.gain.setValueAtTime(0.06, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.35);

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 450);
    }

    public playDash() {
        this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(587.33, this.ctx!.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, this.ctx!.currentTime + 0.15); // D6
        gain.gain.setValueAtTime(0.05, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.15);

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 250);
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
    type: 'heart' | 'star' | 'bubble' | 'text';
    text?: string;
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

export class ItemBox {
    public x: number;
    public y: number;
    public width: number = 24;
    public height: number = 24;
    public collected: boolean = false;
    public type: 'magnet' | 'shield' | 'double' | 'fever_drink';
    private bounceOffset: number = Math.random() * Math.PI * 2;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const types: ('magnet' | 'shield' | 'double' | 'fever_drink')[] = ['magnet', 'shield', 'double', 'fever_drink'];
        this.type = types[Math.floor(Math.random() * types.length)]!;
    }

    public update(speed: number, timeScale: number) {
        this.x -= speed * timeScale;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.collected) return;
        ctx.save();
        const bounce = Math.sin(performance.now() * 0.004 + this.bounceOffset) * 5;
        ctx.translate(this.x, this.y + bounce);

        // Draw Gift Box base
        ctx.fillStyle = '#ff7675'; // Pink/Red box
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // Draw Box Lid
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.rect(-this.width / 2 - 2, -this.height / 2 - 4, this.width + 4, 6);
        ctx.fill();
        ctx.stroke();

        // Draw ribbon (Cross style)
        ctx.fillStyle = '#feca57'; // Gold Ribbon
        // Vertical Ribbon
        ctx.beginPath();
        ctx.rect(-3, -this.height / 2, 6, this.height);
        ctx.fill();
        // Horizontal Ribbon
        ctx.beginPath();
        ctx.rect(-this.width / 2, -3, this.width, 6);
        ctx.fill();

        // Ribbon Bow on top
        ctx.fillStyle = '#feca57';
        ctx.beginPath();
        ctx.ellipse(-6, -this.height / 2 - 6, 5, 3, -Math.PI / 4, 0, Math.PI * 2);
        ctx.ellipse(6, -this.height / 2 - 6, 5, 3, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw icon inside
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let icon = '?';
        if (this.type === 'magnet') icon = 'M';
        else if (this.type === 'shield') icon = 'S';
        else if (this.type === 'double') icon = '2X';
        else if (this.type === 'fever_drink') icon = 'F';
        
        ctx.fillText(icon, 0, 1);

        ctx.restore();
    }

    public isOffScreen(): boolean {
        return this.x + this.width < 0;
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

    // New active status
    public dashActive: boolean = false;
    public xOffset: number = 0;
    public feverActive: boolean = false;

    constructor(canvasHeight: number) {
        this.y = canvasHeight / 2;
    }

    public get currentRadius(): number {
        return this.radius;
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
        const r = this.currentRadius;

        ctx.save();
        ctx.translate(this.x + this.xOffset, this.y);
        ctx.rotate(this.rotation);

        // Body Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.arc(2, 3, r, 0, Math.PI * 2);
        ctx.fill();

        // 1. Tail Feathers
        ctx.fillStyle = char.beakColor;
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.arc(-r + 3, 2, 7 * (r / this.radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-r + 2, -5 * (r / this.radius), 6 * (r / this.radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Main Body (Chubby colored sphere)
        const bodyGrad = ctx.createRadialGradient(-4 * (r / this.radius), -4 * (r / this.radius), 2 * (r / this.radius), 0, 0, r);
        bodyGrad.addColorStop(0, '#ffffff'); // Glare
        bodyGrad.addColorStop(0.2, char.color); 
        bodyGrad.addColorStop(1, this.darkenColor(char.color)); 
        ctx.fillStyle = bodyGrad;
        
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. Rosy Cheek
        ctx.fillStyle = char.cheekColor;
        ctx.beginPath();
        ctx.arc(r / 2 - 2, r / 3, 5 * (r / this.radius), 0, Math.PI * 2);
        ctx.fill();

        // 4. Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(r / 2 + 2, -r / 3.5, 6.5 * (r / this.radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(r / 2 + 3.5, -r / 3.5, 3.5 * (r / this.radius), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(r / 2 + 2.5, -r / 3.5 - 1.5 * (r / this.radius), 1.2 * (r / this.radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(r / 2 + 4.5, -r / 3.5 + 1.2 * (r / this.radius), 0.7 * (r / this.radius), 0, Math.PI * 2);
        ctx.fill();

        // 5. Wing
        ctx.save();
        ctx.translate(-r / 3.5, r / 6);
        const wingFlap = Math.sin(this.wingAngle) * 0.48;
        ctx.rotate(wingFlap);
        
        const wingGrad = ctx.createLinearGradient(-10 * (r / this.radius), 0, 8 * (r / this.radius), 0);
        wingGrad.addColorStop(0, '#ffffff');
        wingGrad.addColorStop(1, char.wingColor);
        ctx.fillStyle = wingGrad;
        
        ctx.beginPath();
        ctx.ellipse(0, 0, 10 * (r / this.radius), 7 * (r / this.radius), -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();

        // 6. Beak
        const beakGrad = ctx.createLinearGradient(r - 3, 0, r + 8, 0);
        beakGrad.addColorStop(0, char.beakColor);
        beakGrad.addColorStop(1, '#ff6b6b');
        ctx.fillStyle = beakGrad;
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.moveTo(r - 2.5, -2);
        ctx.quadraticCurveTo(r + 7, -1, r + 7, 1);
        ctx.quadraticCurveTo(r + 2, 4, r - 1, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(r - 1, 1);
        ctx.lineTo(r + 5.5, 1);
        ctx.stroke();

        ctx.restore(); // Restore body translation/rotation

        // 7. Shield Aura
        if (this.shieldActive) {
            ctx.save();
            ctx.translate(this.x + this.xOffset, this.y);
            ctx.strokeStyle = '#74b9ff';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#74b9ff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
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
                ctx.translate(Math.cos(angle) * (r + 10), Math.sin(angle) * (r + 10));
                drawStar(ctx, 0, 0, 5, 4.5, 2.2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        // 8. Magnet Aura
        if (this.magnetActive || this.feverActive) {
            ctx.save();
            ctx.translate(this.x + this.xOffset, this.y);
            ctx.strokeStyle = this.feverActive ? '#e040fb' : '#ff9f43';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, r + (this.feverActive ? 22 : 16), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 9. Lemon Dash Lightning Aura
        if (this.dashActive) {
            ctx.save();
            ctx.translate(this.x + this.xOffset, this.y);
            ctx.strokeStyle = '#ffd32d';
            ctx.lineWidth = 3.0;
            ctx.shadowColor = '#ffd32d';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2 / 6) + (performance.now() * 0.01);
                const ox = Math.cos(angle) * (r + 8);
                const oy = Math.sin(angle) * (r + 8);
                if (i === 0) ctx.moveTo(ox, oy);
                else ctx.lineTo(ox + (Math.random() - 0.5) * 6, oy + (Math.random() - 0.5) * 6);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // 10. Choco Glide Aura
        if (this.glideActive) {
            ctx.save();
            ctx.translate(this.x + this.xOffset, this.y);
            ctx.fillStyle = 'rgba(161, 136, 127, 0.45)';
            ctx.beginPath();
            ctx.arc(-r - 6, Math.sin(performance.now() * 0.01) * 4, 3.5, 0, Math.PI * 2);
            ctx.arc(-r - 12, Math.cos(performance.now() * 0.012) * 5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 11. Plum Fever Golden/Purple Aura
        if (this.feverActive) {
            ctx.save();
            ctx.translate(this.x + this.xOffset, this.y);
            const feverTime = performance.now() * 0.007;
            ctx.lineWidth = 2.0;
            ctx.shadowBlur = 8;
            for (let i = 0; i < 2; i++) {
                ctx.strokeStyle = i === 0 ? '#e040fb' : '#fecb2f';
                ctx.shadowColor = i === 0 ? '#e040fb' : '#fecb2f';
                ctx.beginPath();
                const orbitR = r + 12 + i * 4;
                const startAngle = feverTime + i * Math.PI;
                ctx.arc(0, 0, orbitR, startAngle, startAngle + Math.PI * 0.6);
                ctx.stroke();
            }
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
interface WeatherParticle {
    x: number;
    y: number;
    vy: number;
    vx: number;
    size: number;
    color: string;
    active: boolean;
}

export class WeatherSystem {
    private particles: WeatherParticle[] = [];
    private maxParticles: number = 100;
    public windForce: number = 0.0;
    private weatherState: 'sunny' | 'rainy' | 'snowy' = 'sunny';
    private lastWindChange: number = 0;
    private lastWeatherChange: number = 0;

    constructor(canvasWidth: number, canvasHeight: number) {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                vy: 0,
                vx: 0,
                size: 0,
                color: '#ffffff',
                active: false
            });
        }
    }

    public update(deltaTime: number, timeScale: number, canvasWidth: number, canvasHeight: number, bird: Bird) {
        const now = performance.now();

        if (now - this.lastWeatherChange > 18000) {
            this.lastWeatherChange = now;
            const states: ('sunny' | 'rainy' | 'snowy')[] = ['sunny', 'rainy', 'snowy'];
            const nextState = states[Math.floor(Math.random() * states.length)]!;
            this.weatherState = nextState;
            
            if (this.weatherState === 'rainy') {
                this.particles.forEach(p => {
                    p.active = true;
                    p.x = Math.random() * canvasWidth;
                    p.y = Math.random() * canvasHeight;
                    p.vy = Math.random() * 2.8 + 4.5;
                    p.vx = 0;
                    p.size = Math.random() * 1.5 + 1.0;
                    p.color = 'rgba(162, 191, 237, 0.45)';
                });
            } else if (this.weatherState === 'snowy') {
                this.particles.forEach(p => {
                    p.active = true;
                    p.x = Math.random() * canvasWidth;
                    p.y = Math.random() * canvasHeight;
                    p.vy = Math.random() * 0.8 + 1.2;
                    p.vx = (Math.random() - 0.5) * 0.4;
                    p.size = Math.random() * 2.5 + 1.5;
                    p.color = 'rgba(255, 255, 255, 0.75)';
                });
            } else {
                this.particles.forEach(p => p.active = false);
            }
        }

        if (now - this.lastWindChange > 6000) {
            this.lastWindChange = now;
            if (this.weatherState !== 'sunny') {
                this.windForce = (Math.random() - 0.5) * 1.6;
            } else {
                this.windForce = (Math.random() - 0.5) * 0.4;
            }
        }

        if (bird.feverActive) {
            bird.xOffset = 0;
        } else {
            bird.velocity += (this.windForce * 0.08) * timeScale;
            bird.xOffset = Math.sin(now * 0.0035) * (8 + Math.abs(this.windForce) * 7);
        }

        if (this.weatherState !== 'sunny') {
            for (let i = 0; i < this.maxParticles; i++) {
                const p = this.particles[i]!;
                if (!p.active) {
                    p.x = Math.random() * canvasWidth;
                    p.y = -10;
                    p.active = true;
                    continue;
                }

                p.x += (p.vx + this.windForce * 2.2) * timeScale;
                p.y += p.vy * timeScale;

                if (p.y > canvasHeight || p.x < -20 || p.x > canvasWidth + 20) {
                    p.active = false;
                }
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.weatherState === 'sunny') return;
        
        ctx.save();
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i]!;
            if (!p.active) continue;

            if (this.weatherState === 'rainy') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + this.windForce * 4, p.y + 7);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    public getSkyGradientColors(time: number): [string, string] {
        let colorTop = '#ffccdf'; 
        let colorBottom = '#a2e8dd';
        const hour = time % 24;

        if (hour > 16 && hour <= 19.5) {
            colorTop = '#e17055';
            colorBottom = '#6c5ce7';
        } else if (hour > 19.5 || hour <= 4.5) {
            colorTop = '#1a237e';
            colorBottom = '#0f172a';
        } else if (hour > 4.5 && hour <= 7.0) {
            colorTop = '#a29bfe';
            colorBottom = '#ffeaa7';
        }

        return [colorTop, colorBottom];
    }

    public getWeatherIcon(): string {
        if (this.weatherState === 'rainy') return '🌧️';
        if (this.weatherState === 'snowy') return '❄️';
        return '☀️';
    }

    public getWindArrow(): string {
        if (this.windForce > 0.4) return '→';
        if (this.windForce < -0.4) return '←';
        return '';
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
export class BossBullet {
    public x: number;
    public y: number;
    public vx: number;
    public vy: number;
    public radius: number = 7;
    public active: boolean = true;

    constructor(x: number, y: number, vx: number, vy: number) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
    }

    public update(timeScale: number) {
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#ff7675';
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 2.0;
        
        let rot = Math.PI / 2 * 3;
        let x = 0;
        let y = 0;
        let step = Math.PI / 5;

        ctx.beginPath();
        ctx.moveTo(0, -7.5);
        for (let i = 0; i < 5; i++) {
            x = Math.cos(rot) * 7.5;
            y = Math.sin(rot) * 7.5;
            ctx.lineTo(x, y);
            rot += step;

            x = Math.cos(rot) * 3.5;
            y = Math.sin(rot) * 3.5;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(0, -7.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
}

export class PlayerMissile {
    public x: number;
    public y: number;
    public vx: number = 8.5;
    public radius: number = 6;
    public active: boolean = true;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public update(timeScale: number) {
        this.x += this.vx * timeScale;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        ctx.fillStyle = '#74b9ff';
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 2.0;
        
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#ffeaa7';
        ctx.beginPath();
        ctx.arc(-8, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

export class BossGiant {
    public x: number = 420;
    public y: number = 180;
    public width: number = 90;
    public height: number = 130;
    public hp: number = 100;
    public maxHp: number = 100;
    
    private attackTimer: number = 0;
    private hoverOffset: number = 0;
    private damageFlashTimer: number = 0;

    private offscreenCanvas: HTMLCanvasElement;
    private offscreenCtx: CanvasRenderingContext2D;
    private isDirty: boolean = true;

    constructor() {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.width;
        this.offscreenCanvas.height = this.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
        this.hoverOffset = Math.random() * Math.PI * 2;
    }

    private renderToCache() {
        const ctx = this.offscreenCtx;
        ctx.clearRect(0, 0, this.width, this.height);

        const isHurt = this.damageFlashTimer > 0;
        const center = this.width / 2;
        
        ctx.fillStyle = '#fdcb6e';
        ctx.strokeStyle = '#4a2c00';
        ctx.lineWidth = 3.5;
        
        ctx.beginPath();
        ctx.moveTo(center - 32, 45);
        ctx.quadraticCurveTo(center - 45, 12, center - 20, 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(center + 32, 45);
        ctx.quadraticCurveTo(center + 45, 12, center + 20, 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const bodyGrad = ctx.createRadialGradient(center - 10, 50, 5, center, 65, 42);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.3, isHurt ? '#ff7675' : '#ffeaa7');
        bodyGrad.addColorStop(1, isHurt ? '#c0392b' : '#ff9f43');
        ctx.fillStyle = bodyGrad;
        
        ctx.beginPath();
        ctx.arc(center, 65, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d63031';
        ctx.beginPath();
        ctx.moveTo(center - 16, 26);
        ctx.lineTo(center - 24, 10);
        ctx.lineTo(center, 18);
        ctx.lineTo(center + 24, 10);
        ctx.lineTo(center + 16, 26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHurt ? '#ffffff' : '#2c3e50';
        ctx.beginPath();
        ctx.arc(center - 14, 55, 7, 0, Math.PI * 2);
        ctx.arc(center + 14, 55, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#d63031';
        ctx.beginPath();
        ctx.arc(center - 12, 55, 3, 0, Math.PI * 2);
        ctx.arc(center + 16, 55, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 121, 121, 0.65)';
        ctx.beginPath();
        ctx.arc(center - 24, 68, 5, 0, Math.PI * 2);
        ctx.arc(center + 24, 68, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(center - 20, 75, 40, 6);
        ctx.strokeRect(center - 20, 75, 40, 6);

        this.isDirty = false;
    }

    public update(
        deltaTime: number, 
        timeScale: number, 
        birdY: number, 
        canvasHeight: number,
        onShootBullet: (vx: number, vy: number) => void
    ) {
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
            if (this.damageFlashTimer <= 0) {
                this.isDirty = true;
            }
        }

        if (this.x > 290) {
            this.x -= 1.6 * timeScale;
        }

        this.hoverOffset += 0.0038 * deltaTime;
        this.y = (canvasHeight / 2 - 60) + Math.sin(this.hoverOffset * 2.2) * 58;

        this.attackTimer += deltaTime;
        if (this.attackTimer >= 1500) {
            this.attackTimer %= 1500;
            
            const dx = 80 - this.x;
            const dy = birdY - (this.y + 65);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const speed = 4.2;
            const vx = (dx / dist) * speed;
            const vy = (dy / dist) * speed;

            onShootBullet(vx, vy);
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.isDirty) {
            this.renderToCache();
        }
        ctx.drawImage(this.offscreenCanvas, this.x, this.y);
    }

    public takeDamage(dmg: number) {
        this.hp = Math.max(0, this.hp - dmg);
        this.damageFlashTimer = 180;
        this.isDirty = true;
    }
}

export class Game {
    private ctx: CanvasRenderingContext2D;
    private onScoreChange: (score: number) => void;
    private onStateChange: (state: GameState) => void;
    private onCoinCollected: () => void;
    private onCooldownUpdate: (remaining: number, duration: number) => void;
    private onBossHpChange?: (hp: number, maxHp: number) => void;
    private onFeverGaugeChange: (gauge: number) => void;
    
    private score: number = 0;
    private state: GameState = 'READY';
    private animationId: number = 0;
    private lastTime: number = 0;

    private bird: Bird;
    private pipes: Pipe[] = [];
    private coins: Coin[] = [];
    private itemBoxes: ItemBox[] = [];
    private pipeSpawnTimer: number = 0;
    private audio: AudioManager = new AudioManager();
    private particles: GameParticle[] = [];

    // Fever System State
    private feverGauge: number = 0;
    private feverCombo: number = 0;
    private coinSpawnTimer: number = 0;
    private feverTimeAccumulator: number = 0;
    private rainbowColors: string[] = [];

    // Boss Battle State
    private boss: BossGiant | null = null;
    private bossBullets: BossBullet[] = [];
    private playerMissiles: PlayerMissile[] = [];

    // Active skills duration timers (in ms)
    private shieldDurationRemaining: number = 0;
    private magnetDurationRemaining: number = 0;
    private dashDurationRemaining: number = 0;
    private feverDurationRemaining: number = 0;
    private itemDoubleCoinRemaining: number = 0;
    private skillCooldownRemaining: number = 0;

    // Parallax Layers
    private bgLayers: BackgroundLayer[] = [];
    private groundX: number = 0;
    private weather: WeatherSystem;

    constructor(
        canvas: HTMLCanvasElement, 
        onScoreChange: (score: number) => void,
        onStateChange: (state: GameState) => void,
        onCoinCollected: () => void,
        onCooldownUpdate: (remaining: number, duration: number) => void,
        onBossHpChange: ((hp: number, maxHp: number) => void) | undefined,
        onFeverGaugeChange: (gauge: number) => void
    ) {
        this.ctx = canvas.getContext('2d')!;
        this.onScoreChange = onScoreChange;
        this.onStateChange = onStateChange;
        this.onCoinCollected = onCoinCollected;
        this.onCooldownUpdate = onCooldownUpdate;
        this.onBossHpChange = onBossHpChange;
        this.onFeverGaugeChange = onFeverGaugeChange;
        
        // Cache rainbow colors to prevent frame HSL string generation GC allocations
        for (let i = 0; i < 360; i++) {
            this.rainbowColors.push(`hsl(${i}, 95%, 85%)`);
        }
        
        this.weather = new WeatherSystem(this.ctx.canvas.width, this.ctx.canvas.height);
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
            // Candy Blast - 모든 파이프 파괴 & 개당 보너스 1점, 1코인 추가
            if (this.pipes.length > 0) {
                this.audio.playExplode();
                const bonus = this.pipes.length;
                this.score += bonus;
                this.onScoreChange(this.score);
                
                // Add coins
                const currentCoins = Number(localStorage.getItem('flappy-candy-coins') || 0);
                localStorage.setItem('flappy-candy-coins', (currentCoins + bonus).toString());
                this.onCoinCollected();

                this.pipes.forEach(pipe => {
                    this.spawnParticleTrail(pipe.x + pipe.width / 2, this.ctx.canvas.height / 2, 14, true);
                    this.spawnTextParticle("+1 Coin & Score!", pipe.x + pipe.width / 2, this.ctx.canvas.height / 2, '#ff7675');
                });
                this.pipes = [];
            }
        } else if (char.id === 'berry') {
            // Star Shield - 4.5초 보호막
            this.bird.shieldActive = true;
            this.shieldDurationRemaining = 4500;
            this.audio.playScore();
            this.spawnParticleTrail(this.bird.x, this.bird.y, 10, true);
        } else if (char.id === 'mango') {
            // Honey Rush - 1.5초간 무적 대시 + 코인 자석
            this.bird.dashActive = true;
            this.bird.magnetActive = true;
            this.dashDurationRemaining = 1500;
            this.magnetDurationRemaining = 1500;
            this.bird.xOffset = 180;
            this.audio.playDash();
            this.spawnParticleTrail(this.bird.x, this.bird.y, 20, true);
        } else if (char.id === 'plum') {
            // Juicy Fever - 즉시 5초 피버 및 코인 2배
            this.triggerFeverMode();
            this.itemDoubleCoinRemaining = 5000;
            this.spawnParticleTrail(this.bird.x, this.bird.y, 16, true);
        }

        this.skillCooldownRemaining = char.cooldown;
    }

    private spawnTextParticle(text: string, x: number, y: number, color: string = '#ffd32d') {
        this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.9,
            vy: -1.6 - Math.random() * 0.9,
            size: 20,
            alpha: 1.0,
            color: color,
            type: 'text',
            text: text,
            rotation: (Math.random() - 0.5) * 0.15,
            rotSpeed: 0
        });
    }

    private checkPerfectPass(pipe: Pipe) {
        if (pipe.passed) return;
        
        const birdY = this.bird.y;
        const gapCenter = pipe.topHeight + this.currentGap / 2;
        const distance = Math.abs(birdY - gapCenter);

        if (distance <= 22) {
            this.feverCombo++;
            this.spawnTextParticle("Perfect!", this.bird.x + this.bird.xOffset, this.bird.y - 20, '#ff7675');
            if (this.feverCombo > 1) {
                this.spawnTextParticle(`${this.feverCombo} Combo!`, this.bird.x + this.bird.xOffset, this.bird.y - 42, '#fecb2f');
            }
            
            if (!this.bird.feverActive) {
                this.feverGauge = Math.min(100, this.feverGauge + 25);
                this.onFeverGaugeChange(this.feverGauge);
                if (this.feverGauge >= 100) {
                    this.triggerFeverMode();
                }
            }
        } else {
            this.feverCombo = 0; // Reset combo if not perfect
            this.spawnTextParticle("Good", this.bird.x + this.bird.xOffset, this.bird.y - 20, '#a29bfe');

            if (!this.bird.feverActive) {
                this.feverGauge = Math.min(100, this.feverGauge + 5);
                this.onFeverGaugeChange(this.feverGauge);
                if (this.feverGauge >= 100) {
                    this.triggerFeverMode();
                }
            }
        }
    }

    private triggerFeverMode() {
        this.bird.feverActive = true;
        this.feverDurationRemaining = 5000; // 5 seconds fever mode
        this.feverGauge = 100;
        this.onFeverGaugeChange(100);
        this.pipes = []; // Obliterate current pipes
        this.audio.playExplode(); // Play blast sound for fever entry
        
        // Spawn colorful explosion particles
        this.spawnParticleTrail(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, 35, true);
    }

    private updateFeverCoins(deltaTime: number, timeScale: number) {
        this.coinSpawnTimer += deltaTime;
        const spawnInterval = 180; // 180ms intervals
        
        if (this.coinSpawnTimer >= spawnInterval) {
            this.coinSpawnTimer %= spawnInterval;
            
            this.feverTimeAccumulator += deltaTime * 0.0053; 
            const canvasWidth = this.ctx.canvas.width;
            const centerY = this.ctx.canvas.height / 2;
            const waveY = centerY + Math.sin(this.feverTimeAccumulator * 2.8) * 85;

            this.coins.push(new Coin(canvasWidth, waveY));
        }
    }

    private triggerBossFight() {
        this.state = 'BOSS_FIGHT';
        this.onStateChange('BOSS_FIGHT');
        this.pipes = [];
        this.boss = new BossGiant();
        this.bossBullets = [];
        this.playerMissiles = [];
        if (this.onBossHpChange) {
            this.onBossHpChange(100, 100);
        }
        this.audio.playExplode();
        this.spawnTextParticle("WARNING!", this.ctx.canvas.width / 2, this.ctx.canvas.height / 2 - 40, '#ff7675');
        this.spawnTextParticle("BOSS APPEARED!", this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, '#fdcb6e');
    }

    private triggerBossDefeated() {
        this.audio.playExplode();
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 45 + 10;
            const cx = this.boss!.x + this.boss!.width / 2 + Math.cos(angle) * dist;
            const cy = this.boss!.y + this.boss!.height / 2 + Math.sin(angle) * dist;
            this.coins.push(new Coin(cx, cy));
        }
        this.spawnParticleTrail(this.boss!.x + this.boss!.width / 2, this.boss!.y + this.boss!.height / 2, 45, true);
        this.spawnTextParticle("VICTORY!", this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, '#55efc4');

        this.boss = null;
        this.bossBullets = [];
        this.playerMissiles = [];
        this.state = 'PLAYING';
        this.onStateChange('PLAYING');
        if (this.onBossHpChange) {
            this.onBossHpChange(0, 100);
        }
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
            this.audio.startBGM();
        }
        
        if (this.state === 'PLAYING') {
            this.bird.jump();
            this.audio.playJump();
            this.spawnParticleTrail(this.bird.x - 8, this.bird.y, 8, true);
        } else if (this.state === 'BOSS_FIGHT') {
            this.bird.jump();
            this.audio.playJump();
            this.spawnParticleTrail(this.bird.x - 8, this.bird.y, 8, true);
            this.playerMissiles.push(new PlayerMissile(this.bird.x + this.bird.currentRadius, this.bird.y));
        } else if (this.state === 'GAME_OVER') {
            this.reset();
            this.state = 'PLAYING';
            this.onStateChange('PLAYING');
            this.audio.playJump();
            this.audio.startBGM();
            this.spawnParticleTrail(this.bird.x - 8, this.bird.y, 8, true);
        }
    }

    private reset() {
        const prevCharId = this.bird.characterId;
        this.bird = new Bird(this.ctx.canvas.height);
        this.bird.characterId = prevCharId;
        
        this.pipes = [];
        this.coins = [];
        this.itemBoxes = [];
        this.particles = [];
        this.score = 0;
        this.onScoreChange(0);
        this.pipeSpawnTimer = 0;

        // Reset Boss Battle State
        this.boss = null;
        this.bossBullets = [];
        this.playerMissiles = [];
        if (this.onBossHpChange) {
            this.onBossHpChange(0, 100);
        }
        
        this.shieldDurationRemaining = 0;
        this.magnetDurationRemaining = 0;
        this.dashDurationRemaining = 0;
        this.feverDurationRemaining = 0;
        this.itemDoubleCoinRemaining = 0;
        this.feverGauge = 0;
        this.onFeverGaugeChange(0);
        this.skillCooldownRemaining = 0;
        this.onCooldownUpdate(0, 1);
    }

    public start() {
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    private checkCollision(): boolean {
        // Zesty Flash dash (LEMON) invincibility
        if (this.bird.dashActive) {
            return false;
        }

        const canvasHeight = this.ctx.canvas.height;
        const radius = this.bird.currentRadius;
        const birdX = this.bird.x + this.bird.xOffset;

        if (this.bird.y + radius - 4 > canvasHeight - 42) {
            return true;
        }
        if (this.bird.y - radius + 6 < 0) {
            return true;
        }

        const gap = this.currentGap;
        for (const pipe of this.pipes) {
            if (
                birdX + radius - 8 > pipe.x &&
                birdX - radius + 8 < pipe.x + pipe.width
            ) {
                if (
                    this.bird.y - radius + 9 < pipe.topHeight ||
                    this.bird.y + radius - 9 > pipe.topHeight + gap
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

        // Update BGM tempo and pitch factoring speed and fever state
        if (this.state === 'PLAYING') {
            const speedFactor = speed / GAME_SPEED;
            this.audio.updateBGMTempo(speedFactor, this.bird.feverActive);
        }

        // Update weather and apply wind forces (Object Pooling particles & deltaTime wind physics)
        this.weather.update(deltaTime, timeScale, this.ctx.canvas.width, this.ctx.canvas.height, this.bird);

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
            if (this.dashDurationRemaining > 0) {
                this.dashDurationRemaining = Math.max(0, this.dashDurationRemaining - deltaTime);
                if (this.dashDurationRemaining === 0) {
                    this.bird.dashActive = false;
                }
            }
            if (this.bird.xOffset > 0) {
                this.bird.xOffset = Math.max(0, this.bird.xOffset - deltaTime * 0.55); // Slide back smoothly
            }
            if (this.feverDurationRemaining > 0) {
                this.feverDurationRemaining = Math.max(0, this.feverDurationRemaining - deltaTime);
                this.feverGauge = (this.feverDurationRemaining / 5000) * 100;
                this.onFeverGaugeChange(this.feverGauge);
                if (this.feverDurationRemaining === 0) {
                    this.bird.feverActive = false;
                    this.feverGauge = 0;
                    this.onFeverGaugeChange(0);
                }
            }
            if (this.itemDoubleCoinRemaining > 0) {
                this.itemDoubleCoinRemaining = Math.max(0, this.itemDoubleCoinRemaining - deltaTime);
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

            if (this.bird.magnetActive || this.bird.feverActive) {
                pullSpeed = 7.5;
                pullRadius = this.bird.characterId === 'mango' ? 220 : 150;
            } else if (this.bird.dashActive) {
                pullSpeed = 16.0; // ultra fast pull during dash
                pullRadius = 240;
            } else if (this.bird.characterId === 'goldy') {
                pullSpeed = 3.2;
                pullRadius = 90; // goldy has passive magnetic range
            }

            if (pullRadius > 0 && !coin.collected && this.state === 'PLAYING') {
                const dx = (this.bird.x + this.bird.xOffset) - coin.x;
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
                const dx = (this.bird.x + this.bird.xOffset) - coin.x;
                const dy = this.bird.y - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.bird.currentRadius + coin.radius + 4) {
                    coin.collected = true;
                    this.coins.splice(i, 1);
                    
                    // Score coin!
                    this.audio.playCoin();
                    const totalCoins = Number(localStorage.getItem('flappy-candy-coins') || 0);
                    const doubleActive = (this.bird.feverActive && this.bird.characterId === 'plum') || (this.itemDoubleCoinRemaining > 0);
                    const gain = doubleActive ? 2 : 1;
                    localStorage.setItem('flappy-candy-coins', String(totalCoins + gain));
                    this.onCoinCollected();

                    // Increase Fever Gauge
                    if (!this.bird.feverActive) {
                        this.feverGauge = Math.min(100, this.feverGauge + 4);
                        this.onFeverGaugeChange(this.feverGauge);
                        if (this.feverGauge >= 100) {
                            this.triggerFeverMode();
                        }
                    }

                    this.spawnParticleTrail(this.bird.x + this.bird.xOffset, this.bird.y, 5, true);
                    continue;
                }
            }

            if (coin.isOffScreen()) {
                this.coins.splice(i, 1);
            }
        }

        // Update and Collide with Item Boxes
        for (let i = this.itemBoxes.length - 1; i >= 0; i--) {
            const box = this.itemBoxes[i]!;
            box.update(speed, timeScale);

            // Collide with bird
            if (!box.collected && this.state === 'PLAYING') {
                const dx = (this.bird.x + this.bird.xOffset) - box.x;
                const dy = this.bird.y - box.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.bird.currentRadius + box.width / 2 + 4) {
                    box.collected = true;
                    this.itemBoxes.splice(i, 1);

                    this.audio.playScore(); // Item get sound
                    
                    let text = "";
                    if (box.type === 'magnet') {
                        this.bird.magnetActive = true;
                        this.magnetDurationRemaining = 5000;
                        text = "MAGNET!";
                    } else if (box.type === 'shield') {
                        this.bird.shieldActive = true;
                        this.shieldDurationRemaining = 5000;
                        text = "SHIELD!";
                    } else if (box.type === 'double') {
                        this.itemDoubleCoinRemaining = 5000;
                        text = "DOUBLE COIN!";
                    } else if (box.type === 'fever_drink') {
                        this.feverGauge = Math.min(100, this.feverGauge + 40);
                        this.onFeverGaugeChange(this.feverGauge);
                        text = "FEVER DRINK!";
                        if (this.feverGauge >= 100) {
                            this.triggerFeverMode();
                        }
                    }

                    this.spawnTextParticle(text, this.bird.x + this.bird.xOffset, this.bird.y - 30, '#feca57');
                    this.spawnParticleTrail(this.bird.x + this.bird.xOffset, this.bird.y, 8, true);
                    continue;
                }
            }

            if (box.isOffScreen()) {
                this.itemBoxes.splice(i, 1);
            }
        }

        if (this.state === 'PLAYING' && this.score >= 30 && this.boss === null) {
            this.triggerBossFight();
        }

        if (this.state !== 'PLAYING' && this.state !== 'BOSS_FIGHT') return;

        // Update Boss fight entities
        if (this.state === 'BOSS_FIGHT' && this.boss) {
            this.boss.update(deltaTime, timeScale, this.bird.y, this.ctx.canvas.height, (vx, vy) => {
                this.bossBullets.push(new BossBullet(this.boss!.x, this.boss!.y + 65, vx, vy));
            });

            // Update Boss bullets (aimed projectiles)
            for (let i = this.bossBullets.length - 1; i >= 0; i--) {
                const b = this.bossBullets[i]!;
                b.update(timeScale);

                if (b.active) {
                    const dx = (this.bird.x + this.bird.xOffset) - b.x;
                    const dy = this.bird.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.bird.currentRadius + b.radius) {
                        b.active = false;
                        this.bossBullets.splice(i, 1);

                        if (this.bird.shieldActive) {
                            this.bird.shieldActive = false;
                            this.shieldDurationRemaining = 0;
                            this.audio.playShieldBreak();
                            this.spawnParticleTrail(this.bird.x + this.bird.xOffset, this.bird.y, 14, true);
                        } else {
                            this.state = 'GAME_OVER';
                            this.onStateChange('GAME_OVER');
                            this.audio.playHit();
                            this.audio.stopBGM();
                            this.spawnParticleTrail(this.bird.x + this.bird.xOffset, this.bird.y, 16, true);
                            return;
                        }
                        continue;
                    }
                }

                if (b.x < -20 || b.x > this.ctx.canvas.width + 20 || b.y < -20 || b.y > this.ctx.canvas.height + 20) {
                    this.bossBullets.splice(i, 1);
                }
            }

            // Update player missiles
            for (let i = this.playerMissiles.length - 1; i >= 0; i--) {
                const m = this.playerMissiles[i]!;
                m.update(timeScale);

                const dx = m.x - (this.boss.x + this.boss.width / 2);
                const dy = m.y - (this.boss.y + this.boss.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < m.radius + 40) { // Hitbox detection
                    this.boss.takeDamage(4);
                    
                    // Add fever gauge on hit
                    if (!this.bird.feverActive) {
                        this.feverGauge = Math.min(100, this.feverGauge + 2);
                        this.onFeverGaugeChange(this.feverGauge);
                        if (this.feverGauge >= 100) {
                            this.triggerFeverMode();
                        }
                    }

                    this.audio.playScore();
                    this.spawnParticleTrail(m.x, m.y, 4, true);
                    this.playerMissiles.splice(i, 1);
                    
                    if (this.onBossHpChange) {
                        this.onBossHpChange(this.boss.hp, this.boss.maxHp);
                    }

                    if (this.boss.hp <= 0) {
                        this.triggerBossDefeated();
                    }
                    continue;
                }

                if (m.x > this.ctx.canvas.width + 20) {
                    this.playerMissiles.splice(i, 1);
                }
            }

            // Direct collision check: bird with boss body
            const dx = (this.bird.x + this.bird.xOffset) - (this.boss.x + this.boss.width / 2);
            const dy = this.bird.y - (this.boss.y + this.boss.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.bird.currentRadius + 38) {
                if (this.bird.shieldActive) {
                    this.bird.shieldActive = false;
                    this.shieldDurationRemaining = 0;
                    this.audio.playShieldBreak();
                    this.boss.takeDamage(15);

                    // Add fever gauge on shield slam
                    if (!this.bird.feverActive) {
                        this.feverGauge = Math.min(100, this.feverGauge + 10);
                        this.onFeverGaugeChange(this.feverGauge);
                        if (this.feverGauge >= 100) {
                            this.triggerFeverMode();
                        }
                    }

                    this.spawnParticleTrail(this.bird.x + this.bird.xOffset, this.bird.y, 14, true);
                    if (this.onBossHpChange) this.onBossHpChange(this.boss.hp, this.boss.maxHp);
                    if (this.boss.hp <= 0) this.triggerBossDefeated();
                } else {
                    this.state = 'GAME_OVER';
                    this.onStateChange('GAME_OVER');
                    this.audio.playHit();
                    this.audio.stopBGM();
                    this.spawnParticleTrail(this.bird.x + this.bird.xOffset, this.bird.y, 16, true);
                    return;
                }
            }
        }

        this.bird.update(timeScale);

        if (Math.random() < 0.35) {
            this.spawnParticleTrail(this.bird.x + this.bird.xOffset - 12, this.bird.y + (Math.random() - 0.5) * 6, 1, false);
        }

        if (this.checkCollision()) {
            if (this.bird.shieldActive) {
                // Pop shield protection!
                this.bird.shieldActive = false;
                this.shieldDurationRemaining = 0;
                this.audio.playShieldBreak();
                this.spawnParticleTrail(this.bird.x + this.bird.xOffset, this.bird.y, 14, true);

                // Blow up colliding pipes
                for (let i = this.pipes.length - 1; i >= 0; i--) {
                    const pipe = this.pipes[i]!;
                    if (
                        this.bird.x + this.bird.xOffset + this.bird.currentRadius - 8 > pipe.x &&
                        this.bird.x + this.bird.xOffset - this.bird.currentRadius + 8 < pipe.x + pipe.width
                    ) {
                        this.pipes.splice(i, 1);
                    }
                }
            } else {
                this.state = 'GAME_OVER';
                this.onStateChange('GAME_OVER');
                this.audio.playHit();
                this.audio.stopBGM();
                this.spawnParticleTrail(this.bird.x + this.bird.xOffset, this.bird.y, 16, true);
                return;
            }
        }

        if (this.bird.feverActive) {
            this.pipeSpawnTimer = 0;
            this.updateFeverCoins(deltaTime, timeScale);
        } else {
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
                } else if (Math.random() < 0.20) {
                    // 20% chance to spawn item box in the gap if coin is not spawned
                    const boxY = newPipe.topHeight + gap / 2;
                    this.itemBoxes.push(new ItemBox(this.ctx.canvas.width + newPipe.width / 2, boxY));
                }
            }
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i]!;
            pipe.update(speed, timeScale, this.ctx.canvas.height, gap);

            if (!pipe.passed && pipe.x + pipe.width < this.bird.x + this.bird.xOffset) {
                this.checkPerfectPass(pipe);
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
        if (this.bird.feverActive) {
            const offset = Math.floor(performance.now() * 0.12) % 360;
            const col1 = this.rainbowColors[offset]!;
            const col2 = this.rainbowColors[(offset + 120) % 360]!;
            const col3 = this.rainbowColors[(offset + 240) % 360]!;
            skyGrad.addColorStop(0, col1);
            skyGrad.addColorStop(0.5, col2);
            skyGrad.addColorStop(1, col3);
        } else {
            const timeVal = (performance.now() * 0.00004) % 24;
            const [colTop, colBottom] = this.weather.getSkyGradientColors(timeVal);
            skyGrad.addColorStop(0, colTop); 
            skyGrad.addColorStop(1, colBottom); 
        }
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

        // 3. Coins & Item Boxes
        this.coins.forEach(coin => coin.draw(this.ctx));
        this.itemBoxes.forEach(box => box.draw(this.ctx));

        // 4. Pipes
        this.pipes.forEach(pipe => pipe.draw(this.ctx, height, gap));

        // Boss Battle graphics (Offscreen cache rendering applied)
        if (this.state === 'BOSS_FIGHT' && this.boss) {
            this.boss.draw(this.ctx);
            this.bossBullets.forEach(bullet => bullet.draw(this.ctx));
            this.playerMissiles.forEach(missile => missile.draw(this.ctx));
        }

        // 5. Particles
        this.drawParticles();

        // 6. Weather particles (rain / snow)
        this.weather.draw(this.ctx);

        // 7. Ground
        this.drawGround(width, height);

        // 8. Bird
        this.bird.draw(this.ctx);

        // 9. Weather Indicator (Canvas top-right corner)
        if (this.state === 'PLAYING' || this.state === 'BOSS_FIGHT') {
            this.ctx.fillStyle = 'rgba(74, 44, 0, 0.75)';
            this.ctx.font = 'bold 15px "Fredoka", sans-serif';
            this.ctx.textAlign = 'right';
            const icon = this.weather.getWeatherIcon();
            const wind = this.weather.getWindArrow();
            this.ctx.fillText(`${icon} ${wind}`, width - 15, 30);
        }

        // 10. Ready text
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
            this.ctx.textAlign = 'center';
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

            if (p.type === 'text' && p.text) {
                this.ctx.font = 'bold 22px "Fredoka", "Arial Black", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = p.color;
                this.ctx.strokeStyle = '#4a2c00';
                this.ctx.lineWidth = 3.5;
                this.ctx.strokeText(p.text, 0, 0);
                this.ctx.fillText(p.text, 0, 0);
            } else if (p.type === 'heart') {
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
