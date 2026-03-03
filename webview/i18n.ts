type Locale = 'ja' | 'en';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'base.subtitle': 'Click or press <kbd>Cmd+N</kbd> to select a folder',
    'base.button': 'Open Folder',
    'rate.error': 'Rate info unavailable',
    'rate.reset': 'Reset',
    'rate.addTitle': 'New Terminal',
    'shortcut.new': 'New',
    'shortcut.close': 'Close',
    'shortcut.vsterm': 'VS Terminal',
    'shortcut.explorer': 'File Explorer',
    'shortcut.nav': 'Navigate',
    'shortcut.wordDel': 'Word Del',
    'shortcut.newline': 'Newline',
    'shortcut.maximize': 'Maximize',
    'notification.completed': 'completed response',
    'rate.quitTitle': 'Quit & Save',
    'quit.overlay': 'Saving sessions...',
  },
  ja: {
    'base.subtitle': 'クリックまたは <kbd>Cmd+N</kbd> でフォルダーを選択',
    'base.button': 'フォルダーを開く',
    'rate.error': 'レート情報取得不可',
    'rate.reset': 'リセット済み',
    'rate.addTitle': '新規ターミナル',
    'shortcut.new': '新規',
    'shortcut.close': '閉じる',
    'shortcut.vsterm': 'VSターミナル',
    'shortcut.explorer': 'Finder/Explorer',
    'shortcut.nav': 'ペイン移動',
    'shortcut.wordDel': '単語削除',
    'shortcut.newline': '改行',
    'shortcut.maximize': '最大化',
    'notification.completed': 'が応答完了',
    'rate.quitTitle': '終了&保存',
    'quit.overlay': 'セッション保存中...',
  },
};

let currentLocale: Locale = 'en';

export function setLocale(locale: string): void {
  currentLocale = locale.startsWith('ja') ? 'ja' : 'en';
}

export function t(key: string): string {
  return translations[currentLocale][key] ?? key;
}
