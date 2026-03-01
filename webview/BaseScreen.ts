import { t } from './i18n';

export class BaseScreen {
  private element: HTMLElement;

  constructor(container: HTMLElement, onOpenFolder: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'base-screen';
    this.element.innerHTML = `
      <div class="base-screen__dropzone">
        <div class="base-screen__icon">&gt;_</div>
        <h2 class="base-screen__title">Agent Panel</h2>
        <p class="base-screen__subtitle">${t('base.subtitle')}</p>
        <button class="base-screen__button">${t('base.button')}</button>
      </div>
    `;
    container.appendChild(this.element);

    const button = this.element.querySelector('.base-screen__button')!;
    button.addEventListener('click', onOpenFolder);

    // dropzone全体もクリック可能
    const dropzone = this.element.querySelector('.base-screen__dropzone')!;
    dropzone.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.base-screen__button')) return;
      onOpenFolder();
    });
    (dropzone as HTMLElement).style.cursor = 'pointer';
  }

  updateLocale(): void {
    const subtitle = this.element.querySelector('.base-screen__subtitle')!;
    subtitle.innerHTML = t('base.subtitle');
    const button = this.element.querySelector('.base-screen__button')!;
    button.textContent = t('base.button');
  }

  show(): void {
    this.element.style.display = 'flex';
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  destroy(): void {
    this.element.remove();
  }
}
