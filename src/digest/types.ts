export type Status = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number; // parsed lines for this job
  retries: number; // lines with status "retry"
  lastStatus: Status;
  lastError: string | null;
  first: string; // `at` of the first line, offset kept as logged
  last: string; // `at` of the last line, offset kept as logged
};

export type Night = {
  night: string;
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse, counted never thrown
  counts: Record<Status, number>; // parsed lines per status
};

// Reads runs/<night>.jsonl. Returns null when the night has no file.
export type ReadNight = (runsDir: string, night: string) => Night | null;
