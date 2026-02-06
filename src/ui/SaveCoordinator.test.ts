import { describe, expect, it } from "vitest";
import { SaveCoordinator } from "./SaveCoordinator";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("SaveCoordinator", () => {
  it("serializes concurrent save requests", async () => {
    let active = 0;
    let maxActive = 0;
    let saveCalls = 0;

    const coordinator = new SaveCoordinator(async () => {
      saveCalls += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      await sleep(20);
      active -= 1;
    });

    await Promise.all([
      coordinator.requestSave("autosave"),
      coordinator.requestSave("manual"),
      coordinator.requestSave("pause"),
    ]);

    expect(maxActive).toBe(1);
    expect(saveCalls).toBe(2);
  });

  it("runs exactly one extra save for a burst during in-flight save", async () => {
    let saveCalls = 0;

    const coordinator = new SaveCoordinator(async () => {
      saveCalls += 1;
      await sleep(20);
    });

    const first = coordinator.requestSave("autosave");
    await sleep(5);
    const second = coordinator.requestSave("inventory-close");
    const third = coordinator.requestSave("pagehide");

    await Promise.all([first, second, third]);

    expect(saveCalls).toBe(2);
  });

  it("flush delegates to the same queue behavior", async () => {
    let saveCalls = 0;
    const coordinator = new SaveCoordinator(async () => {
      saveCalls += 1;
      await sleep(10);
    });

    const first = coordinator.requestSave("autosave");
    await sleep(2);
    const second = coordinator.flush("manual");

    await Promise.all([first, second]);

    expect(saveCalls).toBe(2);
  });
});
