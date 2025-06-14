import { LiquidGlassCore } from './core';
import { LiquidGlassPosition } from './core';

export interface DraggableConfig {
  constrainToViewport?: boolean;
  onDragStart?: (position: LiquidGlassPosition) => void;
  onDrag?: (position: LiquidGlassPosition) => void;
  onDragEnd?: (position: LiquidGlassPosition) => void;
}

export class LiquidGlassDraggable {
  private target: LiquidGlassCore;
  private config: DraggableConfig;
  private isDragging = false;
  private dragStart: { x: number; y: number; initialX: number; initialY: number } | null = null;
  private container: HTMLElement | null = null;

  constructor(target: LiquidGlassCore, config: DraggableConfig = {}) {
    this.target = target;
    this.config = {
      constrainToViewport: true,
      ...config
    };
    this.container = target.getContainer();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Touch events for mobile support
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this));
    document.addEventListener('touchmove', this.handleTouchMove.bind(this));
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.container) return;

    this.startDrag(e.clientX, e.clientY);
    e.preventDefault();
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.dragStart) return;

    this.updateDrag(e.clientX, e.clientY);
  }

  private handleMouseUp(): void {
    this.endDrag();
  }

  private handleTouchStart(e: TouchEvent): void {
    if (!this.container || e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
    e.preventDefault();
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isDragging || !this.dragStart || e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.updateDrag(touch.clientX, touch.clientY);
    e.preventDefault();
  }

  private handleTouchEnd(): void {
    this.endDrag();
  }

  private startDrag(clientX: number, clientY: number): void {
    if (!this.container) return;

    this.isDragging = true;
    this.container.style.cursor = 'grabbing';

    // 添加拖拽状态的CSS类，避免直接修改样式导致的重影
    this.container.classList.add('liquid-glass-dragging');

    const currentPosition = this.target.getPosition();
    this.dragStart = {
      x: clientX,
      y: clientY,
      initialX: currentPosition.x,
      initialY: currentPosition.y
    };

    this.config.onDragStart?.(currentPosition);
  }

  private updateDrag(clientX: number, clientY: number): void {
    if (!this.isDragging || !this.dragStart) return;

    const deltaX = clientX - this.dragStart.x;
    const deltaY = clientY - this.dragStart.y;

    const newPosition = {
      x: this.dragStart.initialX + deltaX,
      y: this.dragStart.initialY + deltaY
    };

    // Apply constraints if enabled
    const finalPosition = this.config.constrainToViewport
      ? this.target.constrainPosition(newPosition.x, newPosition.y)
      : newPosition;

    this.target.setPosition(finalPosition);
    this.config.onDrag?.(finalPosition);
  }

  private endDrag(): void {
    if (!this.isDragging || !this.container) return;

    this.isDragging = false;
    this.container.style.cursor = 'grab';

    // 移除拖拽状态的CSS类
    this.container.classList.remove('liquid-glass-dragging');

    const finalPosition = this.target.getPosition();
    this.config.onDragEnd?.(finalPosition);

    this.dragStart = null;
  }

  public setConfig(newConfig: Partial<DraggableConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public isDragginActive(): boolean {
    return this.isDragging;
  }

  public destroy(): void {
    if (this.container) {
      this.container.removeEventListener('mousedown', this.handleMouseDown);
      this.container.removeEventListener('touchstart', this.handleTouchStart);
    }

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);

    this.container = null;
  }
} 