import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { SoundService } from '../../services/sound.service';

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  depth: number; // 0 = far, 1 = near
  vy: number;
  sway: number;
  phase: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

/**
 * Full-screen animated backdrop: starry sky, aurora, moon, parallax hills with a cozy cabin,
 * depth-layered snow that drifts with the mouse, and Santa's sleigh passing by now and then
 * (click the moon to call him).
 */
@Component({
  selector: 'app-winter-scene',
  templateUrl: './winter-scene.html',
  styleUrl: './winter-scene.scss',
})
export class WinterScene implements AfterViewInit, OnDestroy {
  @ViewChild('stars', { static: true }) starsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('snow', { static: true }) snowCanvas!: ElementRef<HTMLCanvasElement>;

  private zone = inject(NgZone);
  private host = inject(ElementRef<HTMLElement>);
  private sound = inject(SoundService);

  /** Calendar view: tuck the moon into the header so the content doesn't cover it */
  @Input() @HostBinding('class.compact') compact = false;

  readonly sleighFlying = signal(false);

  /** Pine trees for the middle hill layer: x position (0-1440), scale */
  readonly midTrees = [
    { x: 40, s: 0.9 },
    { x: 95, s: 1.25 },
    { x: 150, s: 0.8 },
    { x: 330, s: 1.1 },
    { x: 380, s: 0.75 },
    { x: 610, s: 0.95 },
    { x: 860, s: 1.2 },
    { x: 905, s: 0.85 },
    { x: 950, s: 1 },
    { x: 1250, s: 1.15 },
    { x: 1300, s: 0.8 },
    { x: 1390, s: 1.05 },
  ];

  /** Fairy lights on the big tree next to the cabin */
  readonly treeLights = [
    { x: -14, y: -40, c: '#ff6b6b' },
    { x: 10, y: -52, c: '#f7c873' },
    { x: -6, y: -66, c: '#5cf2b3' },
    { x: 14, y: -28, c: '#7fb8ff' },
    { x: -20, y: -18, c: '#f7c873' },
    { x: 4, y: -82, c: '#ff6b6b' },
    { x: 22, y: -12, c: '#5cf2b3' },
    { x: -2, y: -36, c: '#ff9f43' },
  ];

  private raf = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private stars: Star[] = [];
  private flakes: Flake[] = [];
  private shooting: ShootingStar | null = null;
  private wind = 0;
  private targetWind = 0;
  private mouseX = 0.5;
  private mouseY = 0.5;
  private parallaxX = 0;
  private parallaxY = 0;
  private frame = 0;
  private paused = false;
  private reducedMotion = false;
  private sleighTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTime = 0;

  private readonly onResize = () => this.resize();
  private readonly onPointerMove = (e: PointerEvent) => {
    this.mouseX = e.clientX / Math.max(1, window.innerWidth);
    this.mouseY = e.clientY / Math.max(1, window.innerHeight);
  };

  ngAfterViewInit(): void {
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.zone.runOutsideAngular(() => {
      this.resize();
      window.addEventListener('resize', this.onResize);
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame((t) => this.tick(t));
    });
    this.scheduleSleigh(12000);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    if (this.sleighTimer) clearTimeout(this.sleighTimer);
  }

  /** Easter egg: clicking the moon summons Santa */
  callSanta(): void {
    if (this.sleighFlying()) return;
    this.sound.jingle();
    this.flySleigh();
  }

  private scheduleSleigh(delay: number): void {
    if (this.reducedMotion) return;
    this.sleighTimer = setTimeout(() => {
      if (!this.paused) this.flySleigh();
      this.scheduleSleigh(35000 + Math.random() * 40000);
    }, delay);
  }

  private flySleigh(): void {
    this.sleighFlying.set(true);
    setTimeout(() => this.sleighFlying.set(false), 9000);
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const canvas of [this.starsCanvas.nativeElement, this.snowCanvas.nativeElement]) {
      canvas.width = Math.floor(this.width * this.dpr);
      canvas.height = Math.floor(this.height * this.dpr);
      canvas.style.width = `${this.width}px`;
      canvas.style.height = `${this.height}px`;
    }
    this.buildStars();
    this.buildFlakes();
    this.drawStars(performance.now());
  }

  private buildStars(): void {
    const count = Math.min(260, Math.floor((this.width * this.height) / 5200));
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      // Denser near the top of the sky
      y: Math.pow(Math.random(), 1.6) * this.height * 0.75,
      r: Math.random() < 0.08 ? 1.4 + Math.random() * 0.8 : 0.4 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.8,
    }));
  }

  private buildFlakes(): void {
    const density = this.reducedMotion ? 0.00004 : 0.00013;
    const count = Math.min(280, Math.floor(this.width * this.height * density));
    this.flakes = Array.from({ length: count }, () => this.newFlake(true));
  }

  private newFlake(anywhere: boolean): Flake {
    const depth = Math.random();
    return {
      x: Math.random() * (this.width + 200) - 100,
      y: anywhere ? Math.random() * this.height : -10 - Math.random() * 40,
      r: 0.6 + depth * depth * 3.4,
      depth,
      vy: 18 + depth * 55 + Math.random() * 12,
      sway: 8 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
    };
  }

  private tick(now: number): void {
    this.raf = requestAnimationFrame((t) => this.tick(t));
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.frame++;

    // Pause heavy drawing while a modal (game) is open, so the games get the full frame budget
    if (this.frame % 20 === 0) {
      this.paused = !!document.querySelector('.modal-overlay');
    }
    if (this.paused) return;

    // Smooth parallax and wind from the pointer position
    this.parallaxX += (this.mouseX - 0.5 - this.parallaxX) * 0.04;
    this.parallaxY += (this.mouseY - 0.5 - this.parallaxY) * 0.04;
    const el = this.host.nativeElement as HTMLElement;
    el.style.setProperty('--px', this.parallaxX.toFixed(4));
    el.style.setProperty('--py', this.parallaxY.toFixed(4));
    el.style.setProperty('--scroll', String(Math.min(window.scrollY, 600)));

    this.targetWind = (this.mouseX - 0.5) * 70 + Math.sin(now / 7000) * 12;
    this.wind += (this.targetWind - this.wind) * 0.02;

    if (this.frame % 2 === 0 || this.reducedMotion) {
      this.drawStars(now);
    }
    this.drawSnow(now, dt);
  }

  private drawStars(now: number): void {
    const ctx = this.starsCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    const t = now / 1000;
    for (const s of this.stars) {
      const twinkle = this.reducedMotion ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = s.r > 1.3 ? '#fff6dc' : '#dfe8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.r > 1.3) {
        // Little cross sparkle on the brightest stars
        ctx.globalAlpha = twinkle * 0.5;
        ctx.fillRect(s.x - s.r * 3, s.y - 0.4, s.r * 6, 0.8);
        ctx.fillRect(s.x - 0.4, s.y - s.r * 3, 0.8, s.r * 6);
      }
    }

    // Occasional shooting star
    if (!this.reducedMotion) {
      if (!this.shooting && Math.random() < 0.0025) {
        this.shooting = {
          x: Math.random() * this.width * 0.7,
          y: Math.random() * this.height * 0.25,
          vx: 9 + Math.random() * 5,
          vy: 3 + Math.random() * 2,
          life: 1,
        };
      }
      if (this.shooting) {
        const s = this.shooting;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 10, s.y - s.vy * 10);
        grad.addColorStop(0, `rgba(255,248,225,${s.life})`);
        grad.addColorStop(1, 'rgba(255,248,225,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 10, s.y - s.vy * 10);
        ctx.stroke();
        s.x += s.vx * 2;
        s.y += s.vy * 2;
        s.life -= 0.02;
        if (s.life <= 0) this.shooting = null;
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawSnow(now: number, dt: number): void {
    const ctx = this.snowCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    const t = now / 1000;
    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      f.y += f.vy * dt;
      f.x += (Math.sin(t * 0.8 + f.phase) * f.sway * 0.04 + this.wind * (0.3 + f.depth)) * dt * 2;
      if (f.y > this.height + 10 || f.x < -120 || f.x > this.width + 120) {
        this.flakes[i] = this.newFlake(false);
        continue;
      }
      ctx.globalAlpha = 0.35 + f.depth * 0.6;
      if (f.r > 2.6) {
        // Near flakes get a soft glow so they feel close to the camera
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 1.6);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 1.6, 0, Math.PI * 2);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
