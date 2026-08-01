export interface Poolable {
  active: boolean;
  reset(): void;
}

export class Pool<T extends Poolable> {
  objects: T[] = [];
  private nextVictim = 0;

  constructor(factory: () => T, size: number) {
    for (let i = 0; i < size; i++) {
      const obj = factory();
      obj.active = false;
      this.objects.push(obj);
    }
  }

  spawn(): T | null {
    for (let i = 0; i < this.objects.length; i++) {
      if (!this.objects[i].active) {
        const obj = this.objects[i];
        obj.reset();
        obj.active = true;
        return obj;
      }
    }
    /* FIFO fallback: recycle oldest active object */
    const victim = this.objects[this.nextVictim];
    this.nextVictim = (this.nextVictim + 1) % this.objects.length;
    victim.reset();
    victim.active = true;
    return victim;
  }

  release(obj: T): void {
    obj.active = false;
  }

  forEachActive(fn: (obj: T) => void): void {
    for (let i = 0; i < this.objects.length; i++) {
      if (this.objects[i].active) fn(this.objects[i]);
    }
  }
}
