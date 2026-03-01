export class BaseScreen {
  private element: HTMLElement;

  constructor(container: HTMLElement, onOpenFolder: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'base-screen';
    this.element.innerHTML = `
      <div class="base-screen__dropzone">
        <div class="base-screen__icon">&gt;_</div>
        <h2 class="base-screen__title">Agent Panel</h2>
        <p class="base-screen__subtitle">クリックまたは <kbd>Cmd+N</kbd> でフォルダーを選択</p>
        <button class="base-screen__button">Open Folder</button>
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
