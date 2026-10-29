export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

/** Rows sorted by job. `null` when `runs/<night>.jsonl` doesn't exist. */
export type ReadNight = (runsDir: string, night: string) => Night | null;
