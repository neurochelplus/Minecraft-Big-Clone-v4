export function createMenuMusic(mainMenu: HTMLElement): HTMLAudioElement {
  const menuMusic = new Audio("/menu_music.mp3");
  menuMusic.loop = true;
  menuMusic.volume = 0.3;

  document.addEventListener(
    "click",
    () => {
      if (mainMenu.style.display === "flex" && menuMusic.paused) {
        menuMusic.play().catch(() => {});
      }
    },
    { once: true },
  );

  return menuMusic;
}

export function playMenuMusicIfNeeded(
  mainMenu: HTMLElement,
  menuMusic: HTMLAudioElement,
): void {
  if (mainMenu.style.display === "flex" && menuMusic.paused) {
    menuMusic.play().catch(() => {});
  }
}

export function stopAndResetMenuMusic(menuMusic: HTMLAudioElement): void {
  menuMusic.pause();
  menuMusic.currentTime = 0;
}
