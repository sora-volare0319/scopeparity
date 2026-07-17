export interface CliIo {
  out(message: string): void;
  err(message: string): void;
}

export function safeTerminalText(message: string): string {
  // Preserve line feeds and tabs used by our formatter, but neutralize cursor,
  // color, title, and other terminal-control sequences from paths or input.
  return message.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/gu, "�");
}

export function terminalSafeIo(io: CliIo): CliIo {
  return {
    out: (message) => io.out(safeTerminalText(message)),
    err: (message) => io.err(safeTerminalText(message)),
  };
}

export const processIo: CliIo = {
  out(message) {
    process.stdout.write(message);
  },
  err(message) {
    process.stderr.write(message);
  },
};

export function line(message = ""): string {
  return `${message}\n`;
}
