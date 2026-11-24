import assert from "node:assert";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// shortcut: spawns a synchronous `ps` process per tick, upgrade to /proc or native API if polling <200ms
export function getProcesses(sortBy = "cpu", rawOutput) {
  const key = sortBy === "mem" ? "mem" : "cpu";
  const raw =
    rawOutput ??
    execSync("ps -axo pid,pcpu,pmem,comm", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, LC_ALL: "C" },
    });

  return raw
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [pid, cpu, mem, ...command] = line.trim().split(/\s+/);
      return {
        pid: parseInt(pid, 10),
        cpu: parseFloat(cpu),
        mem: parseFloat(mem),
        command: command.join(" "),
      };
    })
    .filter((p) => Number.isFinite(p.pid) && Number.isFinite(p.cpu) && Number.isFinite(p.mem))
    .sort((a, b) => b[key] - a[key]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fixture =
    "  PID  %CPU %MEM COMM\n  101   4.5  1.2 /usr/sbin/cfprefsd\n  202  18.3  5.4 /Applications/Safari.app/Contents/MacOS/Safari\n  bad   NaN  0.0 /broken\n";
  const parsed = getProcesses("cpu", fixture);
  assert.strictEqual(parsed.length, 2, "Expected 2 valid parsed rows");
  assert.deepStrictEqual(parsed[0], {
    pid: 202,
    cpu: 18.3,
    mem: 5.4,
    command: "/Applications/Safari.app/Contents/MacOS/Safari",
  });
  assert.strictEqual(getProcesses("mem", fixture)[0].pid, 202);

  try {
    const live = getProcesses("cpu");
    console.log("Self-check passed. Top 5 live processes:", live.slice(0, 5));
  } catch {
    console.log("Self-check passed (fixture verified; live `ps` blocked by sandbox).");
  }
}
