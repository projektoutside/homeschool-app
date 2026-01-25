/**
 * Performance Monitor
 * Monitors FPS and triggers optimizations if needed
 */
class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.monitor();
    }

    monitor() {
        const currentTime = performance.now();
        this.frameCount++;

        if (currentTime >= this.lastTime + 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            if (this.fps < 30) {
                window.dispatchEvent(new CustomEvent('lowFPS', { detail: { fps: this.fps } }));
            }
        }

        requestAnimationFrame(() => this.monitor());
    }
}
