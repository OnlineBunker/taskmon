import os from "node:os";
import process from "node:process";
import { getProcesses } from "./procs.js";

const state = {
  selectedIndex: 0,
  sortBy: "cpu",
  processes: [],
  statusMsg: "",
  confirmingKill: null,
};

function truncate(text, max) {
  if (max <= 0) return "";
  if (text.length <= max) return text.padEnd(max);
  return max <= 3 ? text.slice(0, max) : text.slice(0, max - 3) + "...";
}

function render() {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;

  const totalGB = os.totalmem() / 1024 ** 3;
  const usedGB = (os.totalmem() - os.freemem()) / 1024 ** 3;
  const ratio = Math.min(1, Math.max(0, usedGB / totalGB));
  const filled = Math.round(ratio * 20);
  const bar = `[${"|".repeat(filled)}${" ".repeat(20 - filled)}]`;

  const up = os.uptime();
  const uptimeStr = `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`;
  const loadStr = os.loadavg().map((n) => n.toFixed(2)).join(" ");

  const header1 = truncate(`Taskmon (${os.hostname()}) | Uptime: ${uptimeStr} | Load: ${loadStr}`, width);
  const header2 = truncate(
    `RAM ${bar} ${usedGB.toFixed(1)}/${totalGB.toFixed(1)} GB (${(ratio * 100).toFixed(0)}%) | Procs: ${state.processes.length} | Sort: ${state.sortBy.toUpperCase()}`,
    width
  );
  const divider = "─".repeat(width);
  const tableHeader = truncate("   PID      CPU%    MEM%  COMMAND", width);

  const listHeight = Math.max(1, height - 6);
  if (state.processes.length > 0) {
    state.selectedIndex = Math.max(0, Math.min(state.selectedIndex, state.processes.length - 1));
  }
  const start = Math.max(
    0,
    Math.min(
      state.selectedIndex - Math.floor(listHeight / 2),
      Math.max(0, state.processes.length - listHeight)
    )
  );

  const rows = [];
  for (let i = 0; i < listHeight; i++) {
    const idx = start + i;
    const p = state.processes[idx];
    if (!p) {
      rows.push(" ".repeat(width));
      continue;
    }
    const prefix = `${idx === state.selectedIndex ? " > " : "   "}${String(p.pid).padEnd(8)}${p.cpu.toFixed(1).padStart(5)}   ${p.mem.toFixed(1).padStart(5)}  `;
    const line = truncate(prefix + p.command, width);
    rows.push(idx === state.selectedIndex ? `\x1b[7m${line}\x1b[0m` : line);
  }

  const footer = state.confirmingKill
    ? `\x1b[7m${truncate(` Kill ${state.confirmingKill.pid} (${state.confirmingKill.command}) [${state.confirmingKill.signal}]? (y/n)`, width)}\x1b[0m`
    : truncate(
        `↑↓ move | c: cpu | m: mem | k: kill | K: force | q: quit${state.statusMsg ? ` | ${state.statusMsg}` : ""}`,
        width
      );

  const frame = [header1, header2, divider, tableHeader, ...rows, divider, footer].join("\n");
  process.stdout.write(`\x1b[H${frame}\x1b[J`);
}

function refresh() {
  try {
    state.processes = getProcesses(state.sortBy);
  } catch (err) {
    state.statusMsg = `ps error: ${err.code || err.message}`;
  }
  render();
}

let timer;
let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  clearInterval(timer);
  process.stdout.write("\x1b[?25h\x1b[?1049l");
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

process.on("SIGINT", () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });
process.on("exit", cleanup);
process.on("uncaughtException", (err) => {
  cleanup();
  console.error(err);
  process.exit(1);
});

process.stdout.write("\x1b[?1049h\x1b[?25l");
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdout.on("resize", render);

process.stdin.on("data", (key) => {
  if (key === "\x03") {
    cleanup();
    process.exit(0);
  }

  if (state.confirmingKill) {
    if (key === "y" || key === "Y") {
      const { pid, signal } = state.confirmingKill;
      state.confirmingKill = null;
      if (pid === process.pid) {
        state.statusMsg = "Cannot kill Taskmon itself";
      } else {
        try {
          process.kill(pid, signal);
          state.statusMsg = `Killed process ${pid} (${signal})`;
        } catch (err) {
          state.statusMsg = err.code || err.message;
        }
      }
      refresh();
    } else if (key === "n" || key === "N" || key === "\x1b") {
      state.confirmingKill = null;
      state.statusMsg = "Cancelled";
      render();
    }
    return;
  }

  if (key === "\x1b[A") {
    state.selectedIndex = Math.max(0, state.selectedIndex - 1);
    render();
  } else if (key === "\x1b[B") {
    state.selectedIndex = Math.min(Math.max(0, state.processes.length - 1), state.selectedIndex + 1);
    render();
  } else if (key === "c") {
    state.sortBy = "cpu";
    state.selectedIndex = 0;
    refresh();
  } else if (key === "m") {
    state.sortBy = "mem";
    state.selectedIndex = 0;
    refresh();
  } else if (key === "k" || key === "K") {
    const target = state.processes[state.selectedIndex];
    if (target) {
      state.confirmingKill = {
        pid: target.pid,
        command: target.command,
        signal: key === "K" ? "SIGKILL" : "SIGTERM",
      };
      render();
    }
  } else if (key === "q") {
    cleanup();
    process.exit(0);
  }
});

timer = setInterval(refresh, 1500);
refresh();
