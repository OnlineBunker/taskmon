# taskmon

A zero-dependency terminal task manager built with vanilla Node.js ES modules.

Repository: [https://github.com/OnlineBunker/taskmon](https://github.com/OnlineBunker/taskmon)

## Features

- **Zero External Dependencies:** Built entirely on Node.js built-in modules (`node:os`, `node:process`, `node:child_process`, `node:assert`, `node:url`).
- **Live System Header:** Displays hostname, formatted uptime (`Xh Ym`), 1/5/15-minute load averages, a 20-character ASCII RAM usage bar, total process count, and active sort mode.
- **Interactive Process Table:** Polls active processes every `1500ms` and renders a scrollable, terminal-sized viewport that automatically adapts when you resize the window.
- **Alternate Screen Buffer:** Uses ANSI escape sequences to run in a dedicated terminal buffer without cluttering your scrollback history, cleanly restoring the cursor and terminal state on exit or crash.
- **Safe Process Signaling:** Supports both graceful termination (`SIGTERM`) and force killing (`SIGKILL`) behind an interactive `y/n` confirmation prompt, with built-in protection against killing `taskmon` itself.

## Requirements

- **Node.js** with ES module support (`"type": "module"` and `node:*` imports).
- **macOS or Linux** (requires `ps` supporting `ps -axo pid,pcpu,pmem,comm`).

## Getting Started

```bash
git clone [https://github.com/OnlineBunker/taskmon.git](https://github.com/OnlineBunker/taskmon.git)
cd taskmon
npm start
