/**
 * Manages loading screen visibility and progress bar
 */
export class LoadingScreen {
  private loadingScreen: HTMLElement;
  private loadingBarInner: HTMLElement;
  private bgVideo: HTMLVideoElement;
  private progressText: HTMLElement | null;
  private loadProgress = 0;
  private startTime: number;
  private readonly MIN_LOAD_TIME = 2000; // Minimum visibility time in ms
  private manualMode = false;

  constructor(options?: {
    screenId?: string;
    barInnerId?: string;
    progressTextId?: string;
  }) {
    const screenId = options?.screenId ?? "loading-screen";
    const barInnerId = options?.barInnerId ?? "loading-bar-inner";
    const progressTextId = options?.progressTextId ?? "loading-progress-text";
    this.loadingScreen = document.getElementById(screenId)!;
    this.loadingBarInner = document.getElementById(barInnerId)!;
    this.bgVideo = document.getElementById("bg-video") as HTMLVideoElement;
    this.progressText = document.getElementById(progressTextId);
    this.startTime = performance.now();
  }

  /**
   * Start loading progress animation
   */
  start(onComplete: () => void): void {
    this.manualMode = false;
    this.startTime = performance.now();
    this.loadProgress = 0;
    this.show();
    this.updateLoading(onComplete);
  }

  public startManual(): void {
    this.manualMode = true;
    this.startTime = performance.now();
    this.loadProgress = 0;
    this.show();
    this.loadingBarInner.style.width = "0%";
    if (this.progressText) {
      this.progressText.textContent = "0%";
    }
  }

  public setProgress(value: number): void {
    if (!this.manualMode) return;
    const clamped = Math.max(0, Math.min(1, value));
    const percent = clamped * 100;
    this.loadProgress = Math.max(this.loadProgress, percent);
    this.loadingBarInner.style.width = `${this.loadProgress}%`;
    if (this.progressText) {
      this.progressText.textContent = `${Math.floor(this.loadProgress)}%`;
    }
  }

  public finish(onComplete: () => void): void {
    const elapsed = performance.now() - this.startTime;
    const wait = Math.max(0, this.MIN_LOAD_TIME - elapsed);
    this.loadingBarInner.style.width = "100%";
    this.manualMode = false;
    setTimeout(() => {
      this.loadingScreen.style.transition = "opacity 0.5s";
      this.loadingScreen.style.opacity = "0";
      setTimeout(() => {
        this.loadingScreen.style.display = "none";
        onComplete();
      }, 500);
    }, wait);
  }

  private show(): void {
    this.loadingScreen.style.display = "flex";
    this.loadingScreen.style.opacity = "1";
  }

  private checkVideoReady(): boolean {
    return this.bgVideo.readyState >= 3; // HAVE_FUTURE_DATA or better
  }

  private updateLoading(onComplete: () => void): void {
    if (this.manualMode) return;
    const elapsed = performance.now() - this.startTime;
    const timeProgress = Math.min((elapsed / this.MIN_LOAD_TIME) * 100, 100);

    // Track video loading progress
    let videoProgress = 0;
    if (this.bgVideo.buffered.length > 0) {
      videoProgress = 100; // Assume ready if buffered
    } else if (this.checkVideoReady()) {
      videoProgress = 100;
    } else {
      videoProgress = 50; // Fake trickle if video is taking time
    }

    // Weighted progress: 60% time (to show logo), 40% video
    const totalProgress = timeProgress * 0.6 + videoProgress * 0.4;

    this.loadProgress = Math.max(this.loadProgress, totalProgress); // Never go back
    this.loadingBarInner.style.width = `${this.loadProgress}%`;

    if (this.loadProgress >= 99 && elapsed >= this.MIN_LOAD_TIME) {
      // Done
      this.loadingBarInner.style.width = "100%";
      setTimeout(() => {
        this.loadingScreen.style.transition = "opacity 0.5s";
        this.loadingScreen.style.opacity = "0";
        setTimeout(() => {
          this.loadingScreen.style.display = "none";
          onComplete();
        }, 500);
      }, 200);
    } else {
      requestAnimationFrame(() => this.updateLoading(onComplete));
    }
  }
}
