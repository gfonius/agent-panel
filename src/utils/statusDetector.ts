export type TerminalStatus = 'idle' | 'thinking' | 'waiting' | 'error';

export interface StatusDetector {
  processData(terminalId: string, data: string): void;
  removeTerminal(id: string): void;
  getStatus(id: string): TerminalStatus;
}

interface TerminalState {
  buffer: string;
  status: TerminalStatus;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  hysteresisTimer: ReturnType<typeof setTimeout> | null;
}

const BUFFER_MAX = 500;
const DEBOUNCE_MS = 150;
const HYSTERESIS_MS = 2000;

const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;
const ANSI_RED_REGEX = /\x1b\[31m/;
const BRAILLE_REGEX = /[\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F]/;
const PROMPT_REGEX = /\u276F/;
const ERROR_TEXT_REGEX = /Error[:!]/;

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

function detectStatus(rawData: string, strippedData: string): TerminalStatus {
  // Check error (highest priority)
  if (ANSI_RED_REGEX.test(rawData) || ERROR_TEXT_REGEX.test(strippedData)) {
    return 'error';
  }

  // Check waiting
  if (PROMPT_REGEX.test(strippedData)) {
    return 'waiting';
  }

  // Check thinking
  if (BRAILLE_REGEX.test(strippedData)) {
    return 'thinking';
  }

  return 'idle';
}

export function createStatusDetector(
  onStatusChange: (terminalId: string, status: TerminalStatus) => void,
): StatusDetector {
  const terminals = new Map<string, TerminalState>();

  function getOrCreateState(id: string): TerminalState {
    let state = terminals.get(id);
    if (!state) {
      state = {
        buffer: '',
        status: 'idle',
        debounceTimer: null,
        hysteresisTimer: null,
      };
      terminals.set(id, state);
    }
    return state;
  }

  function applyStatus(id: string, state: TerminalState, newStatus: TerminalStatus): void {
    if (state.status === newStatus) {
      return;
    }

    // Hysteresis: thinking -> idle requires 2s delay
    if (state.status === 'thinking' && newStatus === 'idle') {
      if (state.hysteresisTimer !== null) {
        // Already waiting for hysteresis
        return;
      }
      state.hysteresisTimer = setTimeout(() => {
        state.hysteresisTimer = null;
        if (state.status === 'thinking') {
          state.status = 'idle';
          onStatusChange(id, 'idle');
        }
      }, HYSTERESIS_MS);
      return;
    }

    // Cancel hysteresis if transitioning to a non-idle state
    if (state.hysteresisTimer !== null) {
      clearTimeout(state.hysteresisTimer);
      state.hysteresisTimer = null;
    }

    state.status = newStatus;
    onStatusChange(id, newStatus);
  }

  return {
    processData(terminalId: string, data: string): void {
      const state = getOrCreateState(terminalId);

      // Append to rolling buffer
      state.buffer += data;
      if (state.buffer.length > BUFFER_MAX) {
        state.buffer = state.buffer.slice(state.buffer.length - BUFFER_MAX);
      }

      // Debounce the status evaluation
      if (state.debounceTimer !== null) {
        clearTimeout(state.debounceTimer);
      }

      state.debounceTimer = setTimeout(() => {
        state.debounceTimer = null;
        const raw = state.buffer;
        const stripped = stripAnsi(raw);
        const newStatus = detectStatus(raw, stripped);
        applyStatus(terminalId, state, newStatus);
      }, DEBOUNCE_MS);
    },

    removeTerminal(id: string): void {
      const state = terminals.get(id);
      if (state) {
        if (state.debounceTimer !== null) {
          clearTimeout(state.debounceTimer);
        }
        if (state.hysteresisTimer !== null) {
          clearTimeout(state.hysteresisTimer);
        }
        terminals.delete(id);
      }
    },

    getStatus(id: string): TerminalStatus {
      const state = terminals.get(id);
      return state ? state.status : 'idle';
    },
  };
}
