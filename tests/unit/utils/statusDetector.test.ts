import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createStatusDetector,
  type TerminalStatus,
  type StatusDetector,
} from '../../../src/utils/statusDetector';

describe('StatusDetector', () => {
  let detector: StatusDetector;
  let onStatusChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onStatusChange = vi.fn();
    detector = createStatusDetector(onStatusChange);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Initial state is idle
  it('returns idle as the initial status for a new terminal', () => {
    expect(detector.getStatus('term1')).toBe('idle');
  });

  // 2. Braille spinner detection -> thinking
  it('detects Braille spinner characters and sets status to thinking', () => {
    detector.processData('term1', 'Loading \u280B');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('thinking');
  });

  it('detects various Braille spinner characters', () => {
    const brailleChars = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];
    for (const char of brailleChars) {
      const id = `term-${char}`;
      detector.processData(id, `Processing ${char}`);
      vi.advanceTimersByTime(150);
      expect(detector.getStatus(id)).toBe('thinking');
    }
  });

  // 3. Prompt detection -> waiting
  it('detects prompt character and sets status to waiting', () => {
    detector.processData('term1', '\u276F ');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('waiting');
  });

  // 4. Error text detection -> error
  it('detects "Error:" text and sets status to error', () => {
    detector.processData('term1', 'Something Error: failed');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('error');
  });

  it('detects "Error!" text and sets status to error', () => {
    detector.processData('term1', 'Something Error! bad');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('error');
  });

  // 5. ANSI red color detection -> error
  it('detects ANSI red color code and sets status to error', () => {
    detector.processData('term1', '\x1b[31mSomething went wrong\x1b[0m');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('error');
  });

  // 6. Priority: error > waiting > thinking
  it('prioritizes error over waiting', () => {
    detector.processData('term1', '\u276F Error: something');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('error');
  });

  it('prioritizes error over thinking', () => {
    detector.processData('term1', '\u280B Error: something');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('error');
  });

  it('prioritizes waiting over thinking', () => {
    detector.processData('term1', '\u280B \u276F ');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('waiting');
  });

  // 7. ANSI escape stripping
  it('strips ANSI escape sequences before pattern matching', () => {
    // The Error text is wrapped in non-red ANSI codes, so it should still match Error:
    detector.processData('term1', '\x1b[1m\x1b[33mError: something\x1b[0m');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('error');
  });

  it('detects patterns even when surrounded by ANSI sequences', () => {
    detector.processData('term1', '\x1b[32m\u276F \x1b[0m');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('waiting');
  });

  // 8. Rolling buffer truncation at 500 characters
  it('truncates rolling buffer to 500 characters, discarding old data', () => {
    // Fill buffer with 'a' (no pattern match)
    detector.processData('term1', 'a'.repeat(600));
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('idle');

    // Now add Error: - the old data should have been truncated
    detector.processData('term1', 'Error: new');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('error');
  });

  it('keeps buffer at most 500 characters after multiple processData calls', () => {
    // Send 300 chars, then 300 more - buffer should be 500 max
    detector.processData('term1', 'x'.repeat(300));
    detector.processData('term1', 'y'.repeat(300));
    vi.advanceTimersByTime(150);
    // Should still work with fresh data at the end
    detector.processData('term1', '\u276F ');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('waiting');
  });

  // 9. removeTerminal cleanup
  it('removes terminal state on removeTerminal', () => {
    detector.processData('term1', '\u276F ');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('waiting');

    detector.removeTerminal('term1');
    expect(detector.getStatus('term1')).toBe('idle');
  });

  it('does not call callback after terminal is removed', () => {
    detector.processData('term1', '\u276F ');
    vi.advanceTimersByTime(150);
    onStatusChange.mockClear();

    detector.removeTerminal('term1');
    // Processing data for a removed terminal should treat it as new (idle)
    // so if we send a waiting signal, it should call back
    detector.processData('term1', '\u276F ');
    vi.advanceTimersByTime(150);
    // This is a new terminal effectively, so the callback fires for idle->waiting
    expect(onStatusChange).toHaveBeenCalledWith('term1', 'waiting');
  });

  // 10. Callback fires only on state change (not same state)
  it('calls onStatusChange when status changes', () => {
    detector.processData('term1', '\u276F ');
    vi.advanceTimersByTime(150);
    expect(onStatusChange).toHaveBeenCalledWith('term1', 'waiting');
  });

  it('does not call onStatusChange when status remains the same', () => {
    detector.processData('term1', '\u276F ');
    vi.advanceTimersByTime(150);
    onStatusChange.mockClear();

    detector.processData('term1', '\u276F ');
    vi.advanceTimersByTime(150);
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('calls onStatusChange when status transitions between different states', () => {
    detector.processData('term1', '\u276F ');
    vi.advanceTimersByTime(150);
    expect(onStatusChange).toHaveBeenCalledWith('term1', 'waiting');

    onStatusChange.mockClear();
    detector.processData('term1', 'Error: bad');
    vi.advanceTimersByTime(150);
    expect(onStatusChange).toHaveBeenCalledWith('term1', 'error');
  });

  // Debounce behavior
  it('debounces status updates by 150ms', () => {
    detector.processData('term1', '\u276F ');
    // Before debounce fires
    expect(detector.getStatus('term1')).toBe('idle');
    expect(onStatusChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('waiting');
    expect(onStatusChange).toHaveBeenCalledWith('term1', 'waiting');
  });

  // Hysteresis: thinking -> idle has 2 second delay
  it('delays thinking to idle transition by 2 seconds (hysteresis)', () => {
    // Enter thinking state
    detector.processData('term1', '\u280B processing');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('thinking');

    // Send data with no pattern -> should eventually go to idle
    // Clear buffer by sending plain text
    onStatusChange.mockClear();
    detector.processData('term1', 'a'.repeat(500));
    vi.advanceTimersByTime(150);
    // Should still be thinking due to hysteresis
    expect(detector.getStatus('term1')).toBe('thinking');

    // After 2 seconds total, should transition to idle
    vi.advanceTimersByTime(2000);
    expect(detector.getStatus('term1')).toBe('idle');
    expect(onStatusChange).toHaveBeenCalledWith('term1', 'idle');
  });

  it('cancels hysteresis if new thinking data arrives', () => {
    // Enter thinking state
    detector.processData('term1', '\u280B processing');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('thinking');

    // Send plain data to trigger idle transition
    onStatusChange.mockClear();
    detector.processData('term1', 'a'.repeat(500));
    vi.advanceTimersByTime(150);

    // Before hysteresis completes, send thinking data again
    vi.advanceTimersByTime(1000);
    detector.processData('term1', '\u280B still processing');
    vi.advanceTimersByTime(150);

    // Should remain thinking
    expect(detector.getStatus('term1')).toBe('thinking');
    expect(onStatusChange).not.toHaveBeenCalledWith('term1', 'idle');
  });

  // Multiple terminals are independent
  it('maintains independent state per terminal', () => {
    detector.processData('term1', '\u276F ');
    detector.processData('term2', '\u280B loading');
    vi.advanceTimersByTime(150);

    expect(detector.getStatus('term1')).toBe('waiting');
    expect(detector.getStatus('term2')).toBe('thinking');
  });

  // ANSI red detection should work with raw data (before stripping)
  it('detects ANSI red in raw data before stripping for error status', () => {
    detector.processData('term1', '\x1b[31mfailed\x1b[0m');
    vi.advanceTimersByTime(150);
    expect(detector.getStatus('term1')).toBe('error');
  });
});
