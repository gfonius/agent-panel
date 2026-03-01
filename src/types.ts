export interface TerminalSession {
  id: string;
  directory: string;
  resumeId?: string;
  gridPosition: number;
}

export interface SavedState {
  sessions: TerminalSession[];
  version: number;
}

export interface RateLimitInfo {
  fiveHour: {
    utilization: number;
    resetsAt: string;
  };
  sevenDay: {
    utilization: number;
    resetsAt: string;
  };
  sevenDaySonnet: {
    utilization: number;
    resetsAt: string;
  } | null;
  fetchedAt: number;
}
