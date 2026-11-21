import { strokeLimits } from './annotations.js';
import type { Point } from './core.js';

interface TouchAim {
  readonly pointer: number | null;
  point: Point | null;
  screen: Point | null;
}

interface PendingStroke {
  readonly pointer: number | null;
  readonly points: Point[];
}

export class BoardInput {
  #touch: TouchAim | null = null;
  #ink: PendingStroke | null = null;
  #cancelledPointer: number | null = null;

  constructor(
    private readonly capture: (pointer: number) => void,
    private readonly release: (pointer: number) => void,
  ) {}

  get touch(): Readonly<TouchAim> | null {
    return this.#touch;
  }

  get ink(): PendingStroke | null {
    return this.#ink;
  }

  takeCancelledPointer(pointer: number): boolean {
    if (pointer !== this.#cancelledPointer) return false;
    this.#cancelledPointer = null;
    return true;
  }

  startTouch(pointer: number, point: Point, screen: Point): boolean {
    this.#touch = { pointer, point, screen };
    if (this.#capture(pointer)) return true;
    this.cancelTouch();
    return false;
  }

  moveTouch(point: Point | null, screen: Point): boolean {
    if (!this.#touch) return false;
    const changed = point?.x !== this.#touch.point?.x || point?.y !== this.#touch.point?.y;
    this.#touch.point = point;
    this.#touch.screen = screen;
    return changed;
  }

  awaitConfirmation(point: Point): void {
    this.#touch = { pointer: null, point, screen: null };
  }

  moveConfirmation(point: Point): void {
    if (this.#touch?.pointer === null) this.#touch.point = { ...point };
  }

  takeConfirmation(): Point | null {
    const point = this.#touch?.pointer === null ? this.#touch.point : null;
    this.cancelTouch();
    return point;
  }

  startInk(pointer: number | null, point: Point): boolean {
    this.#ink = { pointer, points: [point] };
    if (pointer === null || this.#capture(pointer)) return true;
    this.cancelInk();
    return false;
  }

  /** Returns true when the sample limit cancelled the gesture. */
  appendInk(point: Point): boolean {
    if (!this.#ink) return false;
    const { points } = this.#ink;
    const last = points.at(-1)!;
    if (Math.hypot(point.x - last.x, point.y - last.y) < 0.01) return false;
    if (points.length >= strokeLimits.pointsPerStroke) {
      this.cancelInk();
      return true;
    }
    points.push(point);
    return false;
  }

  takeInk(): Point[] | undefined {
    const points = this.#ink?.points;
    this.cancelInk();
    return points;
  }

  cancelInk(): void {
    const pointer = this.#ink?.pointer;
    this.#ink = null;
    this.#release(pointer);
  }

  cancelTouch(): void {
    const pointer = this.#touch?.pointer;
    this.#touch = null;
    this.#release(pointer);
  }

  cancel(): void {
    this.cancelInk();
    this.cancelTouch();
  }

  #capture(pointer: number): boolean {
    try {
      this.capture(pointer);
      return true;
    } catch {
      return false;
    }
  }

  #release(pointer: number | null | undefined): void {
    if (pointer == null) return;
    this.#cancelledPointer = pointer;
    this.release(pointer);
  }
}
