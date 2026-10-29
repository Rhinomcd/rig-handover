import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(
    join(runsDir, '2026-10-28.jsonl'),
    [
      '{"at":"2026-10-28T23:00:02+01:00","job":"b/job","status":"ok","owner":null}',
      '{"at":"2026-10-28T23:01:00+01:00","job":"a/job","status":"fail","owner":"rook","error":"boom"}',
      '{"at":"2026-10-28T23:02:00+01:00","job":"a/j',
    ].join('\n'),
  );
  writeFileSync(join(runsDir, '2026-10-29.jsonl'), '');
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
});

describe('GET /digest/:night', () => {
  it('renders the rows sorted by job, marks the fail and counts the bad line', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('<tr class="warn"><td>a/job</td>');
    expect(html).toContain('<td>—</td>');
    expect(html).toContain('1 line did not parse');
  });

  it('404s a night with no file', async () => {
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
  });

  it('renders an empty night as nothing ran', async () => {
    const res = await app.request('/digest/2026-10-29');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the same rows, in the same order, as the page', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    const night = (await res.json()) as { rows: { job: string }[]; badLines: number };
    const html = await (await app.request('/digest/2026-10-28')).text();
    const pageJobs = [...html.matchAll(/<tr(?: class="warn")?><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(res.status).toBe(200);
    expect(night.rows.map((r) => r.job)).toEqual(pageJobs);
    expect(night.badLines).toBe(1);
  });

  it('404s a night with no file', async () => {
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
  });

  it('returns no rows for the empty night', async () => {
    expect(await (await app.request('/api/digest/2026-10-29')).json()).toEqual({ night: '2026-10-29', rows: [], badLines: 0 });
  });
});
