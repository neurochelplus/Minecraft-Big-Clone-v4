import type { IGameRuntime } from "../contracts/game";

export class MobileControls {
  private game: IGameRuntime;
  private joystickZone: HTMLElement;
  private joystickStick: HTMLElement;
  private stickStartX: number = 0;
  private stickStartY: number = 0;
  private isDraggingStick: boolean = false;
  private joystickTouchId: number | null = null;

  // Touch IDs for multi-touch handling
  private attackTouchId: number | null = null;
  private lastAttackX: number = 0;
  private lastAttackY: number = 0;

  private lookTouchId: number | null = null;
  private lastLookX: number = 0;
  private lastLookY: number = 0;

  private placeTouchId: number | null = null;

  constructor(game: IGameRuntime) {
    this.game = game;
    this.joystickZone = document.getElementById("joystick-zone")!;
    this.joystickStick = document.getElementById("joystick-stick")!;

    if (!this.game.renderer.getIsMobile()) return;

    this.initJoystick();
    this.initButtons();
    this.initCameraLook();
  }

  private initJoystick() {
    this.joystickZone.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.game.gameState.getPaused()) return;

      if (this.isDraggingStick) return;

      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;

      this.stickStartX = touch.clientX;
      this.stickStartY = touch.clientY;

      this.joystickStick.style.transition = "none";
      this.joystickStick.style.transform = `translate(-50%, -50%)`;

      this.isDraggingStick = true;
    });

    this.joystickZone.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (this.game.gameState.getPaused()) return;

      if (!this.isDraggingStick || this.joystickTouchId === null) return;

      let touch: Touch | undefined;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          touch = e.changedTouches[i];
          break;
        }
      }

      if (!touch) return;

      const dx = touch.clientX - this.stickStartX;
      const dy = touch.clientY - this.stickStartY;

      const maxDist = 40;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const clampedDist = Math.min(distance, maxDist);
      const angle = Math.atan2(dy, dx);

      const stickX = Math.cos(angle) * clampedDist;
      const stickY = Math.sin(angle) * clampedDist;

      this.joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

      const threshold = 10;
      const isMoving = Math.abs(dx) > threshold || Math.abs(dy) > threshold;

      const btnRun = document.getElementById("btn-run");
      if (btnRun) {
        if (isMoving) {
          // btnRun.style.display = "flex"; // CSS handles pos, just show/hide
          // Actually if we set it to flex here, we override CSS display: none
          // We need to ensure position is correct. CSS sets position absolute.
          btnRun.style.display = "flex";
        } else {
          btnRun.style.display = "none";
          this.game.player.physics.isSprinting = false;
          btnRun.style.backgroundColor = "";
        }
      }

      this.game.player.physics.moveForward = dy < -threshold;
      this.game.player.physics.moveBackward = dy > threshold;
      this.game.player.physics.moveLeft = dx < -threshold;
      this.game.player.physics.moveRight = dx > threshold;
    });

    const resetStick = (e: TouchEvent) => {
      if (!this.isDraggingStick || this.joystickTouchId === null) return;

      let touchFound = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          touchFound = true;
          break;
        }
      }

      if (touchFound) {
        this.isDraggingStick = false;
        this.joystickTouchId = null;
        this.joystickStick.style.transform = `translate(-50%, -50%)`;
        this.game.player.physics.moveForward = false;
        this.game.player.physics.moveBackward = false;
        this.game.player.physics.moveLeft = false;
        this.game.player.physics.moveRight = false;

        const btnRun = document.getElementById("btn-run");
        if (btnRun) {
          btnRun.style.display = "none";
          btnRun.style.backgroundColor = "";
          this.game.player.physics.isSprinting = false;
        }
      }
    };

    this.joystickZone.addEventListener("touchend", resetStick);
    this.joystickZone.addEventListener("touchcancel", resetStick);
  }

  private initButtons() {
    document.getElementById("btn-jump")!.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.game.player.physics.jump();
    });

    const btnRun = document.getElementById("btn-run");
    if (btnRun) {
      btnRun.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.game.player.physics.isSprinting =
          !this.game.player.physics.isSprinting;
        btnRun.style.backgroundColor = this.game.player.physics.isSprinting
          ? "rgba(255, 100, 0, 0.5)"
          : "";
      });
    }

    const btnAttack = document.getElementById("btn-attack")!;

    btnAttack.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.game.gameState.getPaused()) return;

      if (this.attackTouchId !== null) return;

      const touch = e.changedTouches[0];
      this.attackTouchId = touch.identifier;
      this.lastAttackX = touch.clientX;
      this.lastAttackY = touch.clientY;

      this.game.isAttackPressed = true;
      this.game.player.hand.punch();
      this.game.player.combat.performAttack();
      this.game.blockBreaking.start(this.game.world);
    });

    btnAttack.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (this.game.gameState.getPaused()) return;

      if (this.attackTouchId === null) return;

      let touch: Touch | undefined;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.attackTouchId) {
          touch = e.changedTouches[i];
          break;
        }
      }
      if (!touch) return;

      const dx = touch.clientX - this.lastAttackX;
      const dy = touch.clientY - this.lastAttackY;

      this.lastAttackX = touch.clientX;
      this.lastAttackY = touch.clientY;

      const SENSITIVITY = 0.005;
      this.game.renderer.controls.object.rotation.y -= dx * SENSITIVITY;
      this.game.renderer.camera.rotation.x -= dy * SENSITIVITY;
      this.game.renderer.camera.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.game.renderer.camera.rotation.x),
      );
    });

    const endAttack = (e: TouchEvent) => {
      e.preventDefault();
      if (this.attackTouchId === null) return;

      let touchFound = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.attackTouchId) {
          touchFound = true;
          break;
        }
      }

      if (touchFound) {
        this.game.isAttackPressed = false;
        this.game.player.hand.stopPunch();
        this.game.blockBreaking.stop();
        this.attackTouchId = null;
      }
    };

    btnAttack.addEventListener("touchend", endAttack);
    btnAttack.addEventListener("touchcancel", endAttack);

    const btnPlace = document.getElementById("btn-place")!;
    btnPlace.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.game.gameState.getPaused()) return;

      if (this.placeTouchId !== null) return;

      const touch = e.changedTouches[0];
      this.placeTouchId = touch.identifier;

      this.game.isUsePressed = true;
      // Interact immediately (for placing blocks / opening inventories)
      this.game.blockInteraction.interact(this.game.world);
    });

    const endPlace = (e: TouchEvent) => {
      e.preventDefault();
      if (this.placeTouchId === null) return;

      let touchFound = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.placeTouchId) {
          touchFound = true;
          break;
        }
      }

      if (touchFound) {
        this.game.isUsePressed = false;
        this.placeTouchId = null;
      }
    };

    btnPlace.addEventListener("touchend", endPlace);
    btnPlace.addEventListener("touchcancel", endPlace);
    btnPlace.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    // Inventory button needs access to toggleInventory from main/Game.
    // Ideally Game should have toggleInventory method or similar.
    // For now we can dispatch an event or use a callback if we want strict decoupling,
    // but sticking to direct access pattern:
    // We need to trigger the inventory UI. The Game class has inventoryUI.
    // But toggling inventory involves UI state changes (menu display).
    // Let's assume Game or UI manager handles this.
    // Re-implementation of toggleInventory logic inside MobileControls or callback?
    // Let's pass a callback or dispatch event.
    // Actually, btn-inv listener was calling toggleInventory(false) in main.ts.

    document.getElementById("btn-inv")!.addEventListener("touchstart", (e) => {
      e.preventDefault();
      // Dispatch custom event to be handled by main/Game
      window.dispatchEvent(new CustomEvent("toggle-inventory"));
    });

    // Menu Button
    document.getElementById("btn-menu")!.addEventListener("touchstart", (e) => {
      e.preventDefault();
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent("toggle-pause-menu"));
    });
  }

  private initCameraLook() {
    document.addEventListener("touchstart", (e) => {
      if (this.game.gameState.getPaused()) return;
      if (this.lookTouchId !== null) return;

      const target = e.target as HTMLElement;

      if (
        target.closest("#joystick-zone") ||
        target.closest(".mob-btn") ||
        target.closest("#inventory-menu") ||
        target.closest("#hotbar") ||
        target.closest("#btn-inv") ||
        target.closest("#btn-menu") // Added btn-menu
      )
        return;

      const touch = e.changedTouches[0];
      this.lookTouchId = touch.identifier;
      this.lastLookX = touch.clientX;
      this.lastLookY = touch.clientY;
    });

    document.addEventListener(
      "touchmove",
      (e) => {
        if (this.game.gameState.getPaused()) return;
        if (this.lookTouchId === null) return;
        if (e.cancelable) e.preventDefault();

        let touch: Touch | undefined;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.lookTouchId) {
            touch = e.changedTouches[i];
            break;
          }
        }

        if (!touch) return;

        const dx = touch.clientX - this.lastLookX;
        const dy = touch.clientY - this.lastLookY;

        this.lastLookX = touch.clientX;
        this.lastLookY = touch.clientY;

        const SENSITIVITY = 0.005;
        this.game.renderer.controls.object.rotation.y -= dx * SENSITIVITY;
        this.game.renderer.camera.rotation.x -= dy * SENSITIVITY;
        this.game.renderer.camera.rotation.x = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, this.game.renderer.camera.rotation.x),
        );
      },
      { passive: false },
    );

    const endLook = (e: TouchEvent) => {
      if (this.lookTouchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.lookTouchId) {
          this.lookTouchId = null;
          break;
        }
      }
    };

    document.addEventListener("touchend", endLook);
    document.addEventListener("touchcancel", endLook);
  }
}
