import { t } from './i18n';

const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh');

export class ShortcutGuide {
  private element: HTMLElement;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'shortcut-guide';
    this.updateContent();
    container.appendChild(this.element);
  }

  updateLocale(): void {
    this.updateContent();
  }

  private updateContent(): void {
    const mod = isMac ? '⌘' : 'Ctrl+';
    const shift = isMac ? '⇧' : 'Shift+';
    const del = isMac ? '⌫' : 'Bksp';
    const arrows = isMac ? '↑↓←→' : '↑↓←→';

    this.element.innerHTML = [
      `<kbd>${mod}N</kbd> ${t('shortcut.new')}`,
      `<kbd>${mod}W</kbd> ${t('shortcut.close')}`,
      `<kbd>${mod}T</kbd> ${t('shortcut.vsterm')}`,
      `<kbd>${mod}F</kbd> ${t('shortcut.explorer')}`,
      `<kbd>${shift}${mod}${arrows}</kbd> ${t('shortcut.nav')}`,
      `<kbd>${mod}${del}</kbd> ${t('shortcut.wordDel')}`,
      `<kbd>⇧Enter</kbd> ${t('shortcut.newline')}`,
      `<kbd>DblClick</kbd> ${t('shortcut.maximize')}`,
    ].map(item => `<span class="shortcut-guide__item">${item}</span>`).join('');
  }

  destroy(): void {
    this.element.remove();
  }
}
