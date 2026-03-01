export class DragDropHandler {
  private overlay: HTMLElement;
  private postMessage: (msg: unknown) => void;
  private dropTarget: HTMLElement;

  constructor(dropTarget: HTMLElement, postMessage: (msg: unknown) => void) {
    this.dropTarget = dropTarget;
    this.postMessage = postMessage;

    // ドロップゾーンオーバーレイ
    this.overlay = document.createElement('div');
    this.overlay.className = 'drop-overlay';
    this.overlay.innerHTML = '<div class="drop-overlay__content">ここにフォルダーをドロップ</div>';
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);

    this.setupListeners();
  }

  private setupListeners(): void {
    let dragCounter = 0;

    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      this.overlay.style.display = 'flex';
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        this.overlay.style.display = 'none';
      }
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      this.overlay.style.display = 'none';

      // 1. File.path（Electron renderer限定、webviewサンドボックスでは通常undefined）
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const path = (file as any).path;
        if (path) {
          this.postMessage({ type: 'dropPath', path });
          return;
        }
      }

      // 2. text/uri-list（VSCode Explorer D&D等）
      const uriList = e.dataTransfer?.getData('text/uri-list');
      if (uriList) {
        const uri = uriList.split('\n')[0].trim();
        if (uri) {
          this.postMessage({ type: 'dropUri', uri });
          return;
        }
      }

      // 3. text/plain（パスが入ってる場合がある）
      const text = e.dataTransfer?.getData('text/plain');
      if (text && (text.startsWith('/') || text.startsWith('file://'))) {
        if (text.startsWith('file://')) {
          this.postMessage({ type: 'dropUri', uri: text });
        } else {
          this.postMessage({ type: 'dropPath', path: text });
        }
        return;
      }

      // 4. フォールバック: ファイルはドロップされたがパス取得不可 → フォルダーピッカーで代替
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        this.postMessage({ type: 'requestFolderPicker' });
      }
    });
  }
}
