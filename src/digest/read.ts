import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, Status } from './types.js';

const statuses = new Set<string>(['ok', 'retry', 'fail']);

type Line = { at: string; job: string; status: Status; owner: string | null; error: string | null };

function parseLine(text: string): Line | null {
  try {
    const v: unknown = JSON.parse(text);
    if (typeof v !== 'object' || v === null) return null;
    const o = v as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
    if (typeof o.status !== 'string' || !statuses.has(o.status)) return null;
    return {
      at: o.at,
      job: o.job,
      status: o.status as Status,
      owner: typeof o.owner === 'string' ? o.owner : null,
      error: typeof o.error === 'string' ? o.error : null,
    };
  } catch {
    return null;
  }
}

export function readNight(runsDir: string, night: string): Night | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;

  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  for (const text of readFileSync(file, 'utf8').split('\n')) {
    if (text.trim() === '') continue;
    const line = parseLine(text);
    if (!line) {
      badLines++;
      continue;
    }
    const row = rows.get(line.job);
    if (!row) {
      rows.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error,
        first: line.at,
        last: line.at,
      });
    } else {
      row.runs++;
      if (line.status === 'retry') row.retries++;
      row.owner = line.owner ?? row.owner;
      row.lastStatus = line.status;
      row.lastError = line.error;
      row.last = line.at;
    }
  }
  return { night, rows: [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0)), badLines };
}
