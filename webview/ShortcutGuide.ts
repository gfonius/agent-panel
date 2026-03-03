import { t } from './i18n';

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
    this.element.innerHTML = [
      `<kbd>⌘N</kbd> ${t('shortcut.new')}`,
      `<kbd>⌘W</kbd> ${t('shortcut.close')}`,
      `<kbd>⌘T</kbd> ${t('shortcut.vsterm')}`,
      `<kbd>⌘F</kbd> ${t('shortcut.explorer')}`,
      `<kbd>⇧⌘↑↓←→</kbd> ${t('shortcut.nav')}`,
      `<kbd>⌘⌫</kbd> ${t('shortcut.wordDel')}`,
      `<kbd>⇧Enter</kbd> ${t('shortcut.newline')}`,
    ].map(item => `<span class="shortcut-guide__item">${item}</span>`).join('');
  }

  destroy(): void {
    this.element.remove();
  }
}
