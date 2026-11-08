const ROOT = `${import.meta.env.BASE_URL}frames`;
import { CROSSFADE_FRAMES, DPR_CAP, PREFETCH_AHEAD, PREFETCH_BEHIND, SHARPEN } from './config.js';

export class FrameEngine {
  constructor(canvas, manifest, onProgress = () => {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.manifest = manifest;
    this.scenes = manifest.scenes;
    this.mobile = matchMedia('(max-width: 767px)').matches;
    this.crossfadeFrames = CROSSFADE_FRAMES;
    this.prefetchAhead = PREFETCH_AHEAD;
    this.prefetchBehind = PREFETCH_BEHIND;
    this.total = this.scenes.reduce((sum, scene) => sum + scene.count, 0);
    this.starts = [];
    let cursor = 0;
    for (const scene of this.scenes) { this.starts.push(cursor); cursor += scene.count; }
    this.cache = new Map();
    this.pending = new Map();
    this.loadQueue = [];
    this.activeLoads = 0;
    this.maxLoads = 5;
    this.lastReady = null;
    this.drawRequest = 0;
    this.onProgress = onProgress;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.dpr = dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.canvas.style.filter = SHARPEN ? 'contrast(1.04) saturate(1.05)' : 'none';
    if (this.lastReady) this.drawImage(this.lastReady);
  }

  setMobile(mobile) {
    if (this.mobile === mobile) return;
    this.mobile = mobile;
    this.assetVersion = (this.assetVersion || 0) + 1;
    this.drawRequest++;
    for (const image of this.cache.values()) image.src = '';
    this.cache.clear();
    for (const entry of this.loadQueue) entry.resolve(null);
    this.pending.clear();
    this.loadQueue = [];
    this.lastReady = null;
  }

  url(index) {
    let sceneIndex = this.starts.length - 1;
    while (sceneIndex > 0 && index < this.starts[sceneIndex]) sceneIndex--;
    const scene = this.scenes[sceneIndex];
    const local = index - this.starts[sceneIndex] + 1;
    const directory = this.mobile ? (scene.mobileDir || scene.dir) : scene.dir;
    const root = this.mobile ? `${import.meta.env.BASE_URL}frames-m` : ROOT;
    return `${root}/${directory}/f_${String(local).padStart(4, '0')}.webp`;
  }

  load(index, priority = false) {
    index = Math.max(0, Math.min(this.total - 1, index));
    if (this.cache.has(index)) return Promise.resolve(this.cache.get(index));
    if (this.pending.has(index)) {
      if (priority) {
        const queuedAt = this.loadQueue.findIndex((entry) => entry.index === index);
        if (queuedAt > 0) this.loadQueue.unshift(this.loadQueue.splice(queuedAt, 1)[0]);
      }
      return this.pending.get(index);
    }
    let entry;
    const promise = new Promise((resolve) => {
      entry = { index, resolve, version: this.assetVersion || 0 };
      this.loadQueue.push(entry);
    });
    entry.promise = promise;
    this.pending.set(index, promise);
    this.pumpLoads();
    return promise;
  }

  pumpLoads() {
    while (this.activeLoads < this.maxLoads && this.loadQueue.length) {
      const entry = this.loadQueue.shift();
      const { index, resolve, version, promise } = entry;
      this.activeLoads++;
      const image = new Image();
      image.decoding = 'async';
      image.src = this.url(index);
      image.decode().then(() => {
        if (version === (this.assetVersion || 0)) {
          this.cache.set(index, image);
          resolve(image);
        } else {
          image.src = '';
          resolve(null);
        }
      }).catch(() => resolve(null)).finally(() => {
        if (this.pending.get(index) === promise) this.pending.delete(index);
        this.activeLoads--;
        this.pumpLoads();
      });
    }
  }

  async prime(count = 40) {
    let loaded = 0;
    const batch = Array.from({ length: Math.min(count, this.total) }, (_, i) => i);
    await Promise.all(batch.map(async (index) => {
      await this.load(index);
      loaded++;
      this.onProgress(loaded / batch.length);
    }));
    this.prune(0);
    return this.cache.has(0);
  }

  prefetch(center, direction = 1) {
    const from = Math.max(0, Math.floor(center) - this.prefetchBehind);
    const to = Math.min(this.total - 1, Math.ceil(center) + this.prefetchAhead);
    const retained = new Map(this.loadQueue.filter((entry) => entry.index >= from && entry.index <= to).map((entry) => [entry.index, entry]));
    for (const entry of this.loadQueue) {
      if (entry.index < from || entry.index > to) {
        if (this.pending.get(entry.index) === entry.promise) this.pending.delete(entry.index);
        entry.resolve(null);
      }
    }
    const order = [];
    if (direction >= 0) {
      for (let index = Math.max(from, Math.floor(center)); index <= to; index++) order.push(index);
      for (let index = Math.min(to, Math.floor(center) - 1); index >= from; index--) order.push(index);
    } else {
      for (let index = Math.min(to, Math.ceil(center)); index >= from; index--) order.push(index);
      for (let index = Math.max(from, Math.ceil(center) + 1); index <= to; index++) order.push(index);
    }
    this.loadQueue = order.map((index) => retained.get(index)).filter(Boolean);
    for (const index of order) if (!this.cache.has(index) && !this.pending.has(index)) this.load(index);
    this.pumpLoads();
    this.prune(center);
  }

  prune(center) {
    const min = Math.floor(center) - this.prefetchBehind;
    const max = Math.ceil(center) + this.prefetchAhead;
    for (const [index, image] of this.cache) {
      if (index < min || index > max) {
        image.src = '';
        this.cache.delete(index);
      }
    }
  }

  isReady(index) {
    return this.cache.has(Math.max(0, Math.min(this.total - 1, index)));
  }

  async draw(index, crossfade = true, crossfadeFrames = this.crossfadeFrames) {
    const target = Math.max(0, Math.min(this.total - 1, Math.round(index)));
    const request = ++this.drawRequest;
    let image = this.cache.get(target);
    if (!image) image = await this.load(target);
    if (!image || request !== this.drawRequest) return;
    this.lastReady = image;
    this.drawImage(image);

    if (!crossfade) return;
    const scene = this.sceneAt(target);
    if (crossfadeFrames > 0 && scene.index > 0 && scene.local < crossfadeFrames) {
      const previous = await this.load(this.starts[scene.index] - 1);
      if (previous && request === this.drawRequest) {
        this.drawImage(previous);
        this.ctx.globalAlpha = Math.min(1, (scene.local + 1) / crossfadeFrames);
        this.drawImage(image, false);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  sceneAt(index) {
    let i = this.starts.length - 1;
    while (i > 0 && index < this.starts[i]) i--;
    return { index: i, local: index - this.starts[i] };
  }

  drawImage(image, clear = true) {
    const scale = Math.max(this.canvas.width / image.naturalWidth, this.canvas.height / image.naturalHeight);
    const w = Math.round(image.naturalWidth * scale);
    const h = Math.round(image.naturalHeight * scale);
    const x = Math.round((this.canvas.width - w) / 2);
    const y = Math.round((this.canvas.height - h) / 2);
    if (clear) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(image, x, y, w, h);
  }
}
