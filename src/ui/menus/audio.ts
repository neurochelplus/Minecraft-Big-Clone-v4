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
