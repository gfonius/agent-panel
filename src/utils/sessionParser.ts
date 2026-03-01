/**
 * Claude CLI の出力からresume IDを解析するユーティリティ
 *
 * Claude CLIが /exit で終了すると以下のような出力が出る:
 *   To resume this conversation, run:
 *   claude --resume abc12345-...
 * または:
 *   claude -r abc12345-...
 */
export function parseResumeId(output: string): string | undefined {
  // claude --resume <uuid> または claude -r <uuid> パターン
  const resumeMatch = output.match(/claude\s+(?:--resume|-r)\s+([0-9a-f-]{36})/i);
  if (resumeMatch) {
    return resumeMatch[1];
  }
  return undefined;
}
