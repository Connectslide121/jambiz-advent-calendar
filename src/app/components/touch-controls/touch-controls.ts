import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Direction output from joystick
 */
export interface JoystickDirection {
  x: number; // -1 to 1 (left to right)
  y: number; // -1 to 1 (up to down)
}

/**
 * TouchControlsComponent - Reusable mobile touch controls
 * Provides virtual joystick and action buttons for mobile games
 */
@Component({
  selector: 'app-touch-controls',
  imports: [CommonModule],
  templateUrl: './touch-controls.html',
  styleUrl: './touch-controls.scss',
})
export class TouchControlsComponent implements OnInit, OnDestroy {
  @Input() showJoystick = true; // Show virtual joystick
  @Input() showJumpButton = true; // Show jump/action button
  @Input() showActionButton = false; // Show secondary action button
  @Input() jumpButtonLabel = '↑'; // Label for jump button
  @Input() actionButtonLabel = 'A'; // Label for action button

  @Output() directionChange = new EventEmitter<JoystickDirection>();
  @Output() jump = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();

  // Joystick state
  joystickActive = false;
  joystickX = 0; // -1 to 1
  joystickY = 0; // -1 to 1
  knobOffsetX = 0; // Visual offset for joystick knob
  knobOffsetY = 0; // Visual offset for joystick knob

  private readonly JOYSTICK_RADIUS = 50; // Max distance from center
  private touchIdentifier: number | null = null;

  ngOnInit(): void {}

  ngOnDestroy(): void {
    // Clean up
    this.joystickActive = false;
  }

  /**
   * Handle joystick touch start
   */
  onJoystickTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    this.touchIdentifier = touch.identifier;
    this.joystickActive = true;
    this.updateJoystickPosition(touch.clientX, touch.clientY, event.target as HTMLElement);
  }

  /**
   * Handle joystick touch move
   */
  onJoystickTouchMove(event: TouchEvent): void {
    if (!this.joystickActive) return;
    event.preventDefault();

    // Find the touch with our identifier
    const touch = Array.from(event.touches).find((t) => t.identifier === this.touchIdentifier);
    if (!touch) return;

    this.updateJoystickPosition(touch.clientX, touch.clientY, event.target as HTMLElement);
  }

  /**
   * Handle joystick touch end
   */
  onJoystickTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.resetJoystick();
  }

  /**
   * Update joystick position based on touch coordinates
   */
  private updateJoystickPosition(clientX: number, clientY: number, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate offset from center
    let dx = clientX - centerX;
    let dy = clientY - centerY;

    // Calculate distance from center
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Limit to joystick radius
    if (distance > this.JOYSTICK_RADIUS) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * this.JOYSTICK_RADIUS;
      dy = Math.sin(angle) * this.JOYSTICK_RADIUS;
    }

    // Update visual position
    this.knobOffsetX = dx;
    this.knobOffsetY = dy;

    // Normalize to -1 to 1 range
    this.joystickX = dx / this.JOYSTICK_RADIUS;
    this.joystickY = dy / this.JOYSTICK_RADIUS;

    // Emit direction change
    this.directionChange.emit({ x: this.joystickX, y: this.joystickY });
  }

  /**
   * Reset joystick to center
   */
  private resetJoystick(): void {
    this.joystickActive = false;
    this.joystickX = 0;
    this.joystickY = 0;
    this.knobOffsetX = 0;
    this.knobOffsetY = 0;
    this.touchIdentifier = null;
    this.directionChange.emit({ x: 0, y: 0 });
  }

  /**
   * Handle jump button press
   */
  onJumpPress(): void {
    this.jump.emit();
  }

  /**
   * Handle action button press
   */
  onActionPress(): void {
    this.action.emit();
  }

  /**
   * Prevent context menu on long press
   */
  onContextMenu(event: Event): void {
    event.preventDefault();
  }
}
