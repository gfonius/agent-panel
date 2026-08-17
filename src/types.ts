export interface TerminalSession {
  id: string;
  directory: string;
  resumeId?: string;
  gridPosition: number;
  customName?: string;
}

export interface SavedState {
  sessions: TerminalSession[];
  version: number;
}

export interface RateLimitWindow {
  key: string;
  utilization: number;
  resetsAt: string | null;
  limitDollars?: number;
  usedDollars?: number;
  remainingDollars?: number;
}

export interface ExtraUsage {
  isEnabled: boolean;
  monthlyLimit: number | null;
  usedCredits: number;
  utilization: number;
  currency: string;
  decimalPlaces: number;
  spendLimitReached: boolean;
  disabledReason: string | null;
}

export interface RateLimitInfo {
  windows: RateLimitWindow[];
  extraUsage: ExtraUsage | null;
  fetchedAt: number;
}
