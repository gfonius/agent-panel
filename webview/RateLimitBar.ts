import { t } from './i18n';
import type { ExtraUsage, RateLimitWindow } from '../src/types';
import { RATE_LIMIT_LABELS } from '../src/constants';

interface RateLimitData {
  windows: RateLimitWindow[];
  extraUsage: ExtraUsage | null;
}

function sanitizeDecimalPlaces(value: number): number {
  return Number.isInteger(value) && value >= 0 && value <= 20 ? value : 2;
}

/**
 * `used / limit` のクレジット表示を組み立てる。DOM に依存しない純粋関数として切り出し、
 * unit test から直接検証できるようにしている。
 *
 * `extraUsage.currency` はパース側 (rateLimitClient.parseExtraUsage) で ISO 4217 の
 * 3文字コードに正規化済みのはずだが、念のためここでも Intl.NumberFormat の RangeError を
 * try/catch で吸収し、通貨コードを後置した素の数値表記にフォールバックする。
 */
export function formatExtraUsage(extraUsage: ExtraUsage): string {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: extraUsage.currency,
      minimumFractionDigits: extraUsage.decimalPlaces,
      maximumFractionDigits: extraUsage.decimalPlaces,
    });

    const used = formatter.format(extraUsage.usedCredits);
    const limit = extraUsage.monthlyLimit === null
      ? t('rate.unlimited')
      : formatter.format(extraUsage.monthlyLimit);

    return `${used} / ${limit}`;
  } catch {
    const decimals = sanitizeDecimalPlaces(extraUsage.decimalPlaces);
    const used = `${extraUsage.usedCredits.toFixed(decimals)} ${extraUsage.currency}`;
    const limit = extraUsage.monthlyLimit === null
      ? t('rate.unlimited')
      : `${extraUsage.monthlyLimit.toFixed(decimals)} ${extraUsage.currency}`;

    return `${used} / ${limit}`;
  }
}

export class RateLimitBar {
  private element: HTMLElement;
  private rowsContainer: HTMLElement;
  private errorMessage: HTMLElement;
  private updateInterval: number | undefined;
  private lastData: RateLimitData | null = null;

  constructor(container: HTMLElement, onOpenFolder?: () => void, onQuit?: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'rate-limit-bar';
    this.element.innerHTML = `
      <div class="rate-limit-bar__content">
        <div class="rate-limit-bar__rows" data-rows></div>
        <div class="rate-limit-bar__error" style="display:none">${t('rate.error')}</div>
        <button class="rate-limit-bar__add" title="${t('rate.addTitle')}">+</button>
        <button class="rate-limit-bar__quit" title="${t('rate.quitTitle')}">⏻</button>
      </div>
    `;
    container.appendChild(this.element);

    if (onOpenFolder) {
      const addBtn = this.element.querySelector('.rate-limit-bar__add')!;
      addBtn.addEventListener('click', onOpenFolder);
    }

    if (onQuit) {
      const quitBtn = this.element.querySelector('.rate-limit-bar__quit')!;
      quitBtn.addEventListener('click', onQuit);
    }

    this.rowsContainer = this.element.querySelector('[data-rows]')!;
    this.errorMessage = this.element.querySelector('.rate-limit-bar__error')!;

    // リセット時刻のカウントダウンを毎秒更新
    this.updateInterval = window.setInterval(() => this.updateCountdowns(), 1000);
  }

  update(data: RateLimitData): void {
    this.lastData = data;
    this.errorMessage.style.display = 'none';
    this.renderRows(data);
    this.updateCountdowns();
  }

  showError(): void {
    this.errorMessage.style.display = 'block';
  }

  /**
   * 枠/クレジット行を描画する。`update()` と `updateLocale()` の両方から呼ばれるため、
   * エラー表示の display 切り替えはここに含めない（`updateLocale()` は
   * エラー表示状態を変更してはいけないため、その制御は呼び出し元に残す）。
   */
  private renderRows(data: RateLimitData): void {
    this.rowsContainer.innerHTML = '';

    for (const win of data.windows) {
      this.rowsContainer.appendChild(this.buildWindowRow(win));
    }

    if (data.extraUsage) {
      this.rowsContainer.appendChild(this.buildExtraUsageRow(data.extraUsage));
    }
  }

  private buildWindowRow(win: RateLimitWindow): HTMLElement {
    const row = document.createElement('div');
    row.className = 'rate-limit-bar__row';
    row.dataset.row = win.key;

    const label = document.createElement('span');
    label.className = 'rate-limit-bar__label';
    label.textContent = RATE_LIMIT_LABELS[win.key] ?? win.key;

    const track = document.createElement('div');
    track.className = 'rate-limit-bar__track';
    const fill = document.createElement('div');
    fill.className = 'rate-limit-bar__fill';
    track.appendChild(fill);

    const text = document.createElement('span');
    text.className = 'rate-limit-bar__text';

    const reset = document.createElement('span');
    reset.className = 'rate-limit-bar__reset';
    if (win.resetsAt) {
      reset.dataset.resetsAt = win.resetsAt;
    }

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(text);
    row.appendChild(reset);

    this.updateBar(fill, text, win.utilization);
    this.updateCountdown(reset);

    return row;
  }

  private buildExtraUsageRow(extraUsage: ExtraUsage): HTMLElement {
    const row = document.createElement('div');
    row.className = 'rate-limit-bar__row rate-limit-bar__row--credit';

    const label = document.createElement('span');
    label.className = 'rate-limit-bar__label';
    label.textContent = t('rate.credit');

    const text = document.createElement('span');
    text.className = 'rate-limit-bar__credit-text';
    text.textContent = formatExtraUsage(extraUsage);

    row.appendChild(label);
    row.appendChild(text);

    return row;
  }

  private updateBar(bar: HTMLElement, text: HTMLElement, utilization: number): void {
    const pct = Math.min(100, Math.max(0, utilization));
    bar.style.width = `${pct}%`;
    text.textContent = `${pct.toFixed(0)}%`;

    // 色の設定
    bar.classList.remove('rate-limit-bar__fill--green', 'rate-limit-bar__fill--yellow', 'rate-limit-bar__fill--red');
    if (pct < 50) {
      bar.classList.add('rate-limit-bar__fill--green');
    } else if (pct < 80) {
      bar.classList.add('rate-limit-bar__fill--yellow');
    } else {
      bar.classList.add('rate-limit-bar__fill--red');
    }
  }

  private updateCountdowns(): void {
    const resets = this.rowsContainer.querySelectorAll<HTMLElement>('.rate-limit-bar__reset');
    resets.forEach((el) => this.updateCountdown(el));
  }

  private updateCountdown(el: HTMLElement): void {
    const resetsAt = el.dataset.resetsAt;
    if (!resetsAt) {
      el.textContent = '';
      return;
    }

    const resetDate = new Date(resetsAt);
    const now = Date.now();
    const diff = resetDate.getTime() - now;

    // リセット日時（ローカルタイムゾーンで MM/DD HH:mm 形式）
    const dateStr = `${resetDate.getMonth() + 1}/${resetDate.getDate()} ${resetDate.getHours().toString().padStart(2, '0')}:${resetDate.getMinutes().toString().padStart(2, '0')}`;

    if (diff <= 0) {
      el.textContent = `${t('rate.reset')} (${dateStr})`;
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    let countdown: string;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainHours = hours % 24;
      countdown = `${days}d${remainHours}h`;
    } else if (hours > 0) {
      countdown = `${hours}h${minutes}m`;
    } else {
      countdown = `${minutes}m`;
    }

    el.textContent = `${countdown} (${dateStr})`;
  }

  updateLocale(): void {
    this.errorMessage.textContent = t('rate.error');
    const addBtn = this.element.querySelector('.rate-limit-bar__add')!;
    (addBtn as HTMLElement).title = t('rate.addTitle');
    const quitBtn = this.element.querySelector('.rate-limit-bar__quit');
    if (quitBtn) (quitBtn as HTMLElement).title = t('rate.quitTitle');

    // ラベル・"Unlimited" 等は行の DOM に焼き付いているため、言語切替時に作り直す。
    // エラー表示の display 状態はここでは変更しない（renderRows() にも含めていない）。
    if (this.lastData) {
      this.renderRows(this.lastData);
      this.updateCountdowns();
    }
  }

  destroy(): void {
    if (this.updateInterval !== undefined) {
      clearInterval(this.updateInterval);
    }
    this.element.remove();
  }
}
