import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-present-svg',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './present-svg.html',
  styleUrl: './present-svg.scss',
})
export class PresentSvgComponent {
  @Input() width = 80;
  @Input() height = 60;
  @Input() color = '#2a9d8f';

  // Proportional metrics
  get borderWidth() {
    return Math.max(1.5, Math.min(2.5, Math.round(Math.min(this.width, this.height) * 0.03)));
  }

  get cornerRadius() {
    return Math.round(Math.min(this.width, this.height) * 0.06);
  }

  get ribbonW() {
    // Keep ribbon ~12% of min dimension, clamp for tiny previews
    return Math.max(6, Math.round(Math.min(this.width, this.height) * 0.12));
  }

  get bowY() {
    // Sit close to the top edge, just touching the box
    return -Math.round(this.height * 0.04);
  }

  get loopW() {
    return Math.round(Math.min(this.width, this.height) * 0.2);
  }

  get loopH() {
    return Math.round(Math.min(this.width, this.height) * 0.26);
  }

  get loopOffset() {
    return Math.round(this.loopW * 0.45);
  }

  get knotR() {
    return Math.max(4, Math.round(Math.min(this.width, this.height) * 0.06));
  }

  get knotOffsetY() {
    return this.bowY; // centered at bowY
  }

  // Teardrop path utilities
  private teardropPath(cx: number, cy: number, w: number, h: number, rotationRad: number) {
    const hw = w / 2;
    const hh = h / 2;
    // Base teardrop around origin
    const points = [
      { x: 0, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: 0, y: hh },
      { x: -hw, y: hh },
      { x: -hw, y: -hh },
    ];
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    const rot = (p: { x: number; y: number }) => ({
      x: p.x * cos - p.y * sin + cx,
      y: p.x * sin + p.y * cos + cy,
    });
    const p0 = rot(points[0]);
    const p1 = rot(points[1]);
    const p2 = rot(points[2]);
    const p3 = rot(points[3]);
    const p4 = rot(points[4]);
    const p5 = rot(points[5]);
    return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y} C ${p4.x} ${p4.y} ${p5.x} ${p5.y} ${p0.x} ${p0.y} Z`;
  }

  get leftLoopPath() {
    return this.teardropPath(-this.loopOffset, this.bowY, this.loopW, this.loopH, -Math.PI / 4);
  }

  get rightLoopPath() {
    // Mirror by rotating opposite and offsetting
    return this.teardropPath(this.loopOffset, this.bowY, this.loopW, this.loopH, Math.PI / 4);
  }
}
