// A new tab should open at its first entry when the player switched from deep in a long page.
export function revealPinnedTabs(button: HTMLElement) {
  const bar = button.parentElement;
  const section = bar?.parentElement;
  if (bar && section && getComputedStyle(bar).position === 'sticky'
    && section.getBoundingClientRect().top < bar.getBoundingClientRect().top - 1) {
    section.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}
