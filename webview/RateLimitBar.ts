import { t } from './i18n';

export class RateLimitBar {
  private element: HTMLElement;
  private fiveHourBar: HTMLElement;
  private fiveHourText: HTMLElement;
  private fiveHourReset: HTMLElement;
  private sevenDayBar: HTMLElement;
  private sevenDayText: HTMLElement;
  private sevenDayReset: HTMLElement;
  private sonnetRow: HTMLElement;
  private sonnetBar: HTMLElement;
  private sonnetText: HTMLElement;
  private sonnetReset: HTMLElement;
  private errorMessage: HTMLElement;
  private updateInterval: number | undefined;

  constructor(container: HTMLElement, onOpenFolder?: () => void, onQuit?: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'rate-limit-bar';
    this.element.innerHTML = `
      <div class="rate-limit-bar__content">
        <div class="rate-limit-bar__rows">
          <div class="rate-limit-bar__row">
            <span class="rate-limit-bar__label">5h</span>
            <div class="rate-limit-bar__track">
              <div class="rate-limit-bar__fill" data-bar="five-hour"></div>
            </div>
            <span class="rate-limit-bar__text" data-text="five-hour">--%</span>
            <span class="rate-limit-bar__reset" data-reset="five-hour"></span>
          </div>
          <div class="rate-limit-bar__row">
            <span class="rate-limit-bar__label">7d</span>
            <div class="rate-limit-bar__track">
              <div class="rate-limit-bar__fill" data-bar="seven-day"></div>
            </div>
            <span class="rate-limit-bar__text" data-text="seven-day">--%</span>
            <span class="rate-limit-bar__reset" data-reset="seven-day"></span>
          </div>
          <div class="rate-limit-bar__row" data-row="sonnet" style="display:none">
            <span class="rate-limit-bar__label">Sonnet</span>
            <div class="rate-limit-bar__track">
              <div class="rate-limit-bar__fill" data-bar="sonnet"></div>
            </div>
            <span class="rate-limit-bar__text" data-text="sonnet">--%</span>
            <span class="rate-limit-bar__reset" data-reset="sonnet"></span>
          </div>
          <div class="rate-limit-bar__error" style="display:none">${t('rate.error')}</div>
        </div>
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

    this.fiveHourBar = this.element.querySelector('[data-bar="five-hour"]')!;
    this.fiveHourText = this.element.querySelector('[data-text="five-hour"]')!;
    this.fiveHourReset = this.element.querySelector('[data-reset="five-hour"]')!;
    this.sevenDayBar = this.element.querySelector('[data-bar="seven-day"]')!;
    this.sevenDayText = this.element.querySelector('[data-text="seven-day"]')!;
    this.sevenDayReset = this.element.querySelector('[data-reset="seven-day"]')!;
    this.sonnetRow = this.element.querySelector('[data-row="sonnet"]')!;
    this.sonnetBar = this.element.querySelector('[data-bar="sonnet"]')!;
    this.sonnetText = this.element.querySelector('[data-text="sonnet"]')!;
    this.sonnetReset = this.element.querySelector('[data-reset="sonnet"]')!;
    this.errorMessage = this.element.querySelector('.rate-limit-bar__error')!;

    // リセット時刻のカウントダウンを毎秒更新
    this.updateInterval = window.setInterval(() => this.updateCountdowns(), 1000);
  }

  update(data: {
    fiveHour: { utilization: number; resetsAt: string };
    sevenDay: { utilization: number; resetsAt: string };
    sevenDaySonnet: { utilization: number; resetsAt: string } | null;
  }): void {
    this.errorMessage.style.display = 'none';
    this.updateBar(this.fiveHourBar, this.fiveHourText, data.fiveHour.utilization);
    this.updateBar(this.sevenDayBar, this.sevenDayText, data.sevenDay.utilization);
    this.fiveHourReset.dataset.resetsAt = data.fiveHour.resetsAt;
    this.sevenDayReset.dataset.resetsAt = data.sevenDay.resetsAt;

    // Sonnet行の表示/非表示
    if (data.sevenDaySonnet) {
      this.sonnetRow.style.display = 'flex';
      this.updateBar(this.sonnetBar, this.sonnetText, data.sevenDaySonnet.utilization);
      this.sonnetReset.dataset.resetsAt = data.sevenDaySonnet.resetsAt;
    } else {
      this.sonnetRow.style.display = 'none';
    }

    this.updateCountdowns();
  }

  showError(): void {
    this.errorMessage.style.display = 'block';
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
    this.updateCountdown(this.fiveHourReset);
    this.updateCountdown(this.sevenDayReset);
    if (this.sonnetRow.style.display !== 'none') {
      this.updateCountdown(this.sonnetReset);
    }
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
  }

  destroy(): void {
    if (this.updateInterval !== undefined) {
      clearInterval(this.updateInterval);
    }
    this.element.remove();
  }
}
