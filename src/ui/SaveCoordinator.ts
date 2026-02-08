import { logger } from "../utils/Logger";

export type SaveReason =
  | "autosave"
  | "inventory-close"
  | "pause"
  | "exit"
  | "visibility-hidden"
  | "pagehide"
  | "beforeunload"
  | "manual";

export class SaveCoordinator {
  private inFlight = false;
  private pending = false;
  private lastReason: SaveReason | null = null;
  private saveFn: () => Promise<void>;

  constructor(saveFn: () => Promise<void>) {
    this.saveFn = saveFn;
  }

  public async requestSave(reason: SaveReason): Promise<void> {
    this.lastReason = reason;

    if (this.inFlight) {
      this.pending = true;
      return;
    }

    this.inFlight = true;
    try {
      do {
        this.pending = false;
        await this.saveFn();
      } while (this.pending);
    } catch (error) {
      logger.error(`[SaveCoordinator] save failed (reason=${this.lastReason}):`, error);
    } finally {
      this.inFlight = false;
    }
  }

  public async flush(reason: SaveReason = "manual"): Promise<void> {
    await this.requestSave(reason);
  }
}
