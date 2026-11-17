import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function appWith(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });
}
const good = '{"at":"2026-01-01T01:00:00+01:00","job":"a/b","status":"ok","owner":null}\n';

describe('digest routes', () => {
  it('200: page and JSON agree on jobs and order', async () => {
    const app = appWith({ '2026-01-01.jsonl': good + '{"at":"2026-01-01T02:00:00+01:00","job":"a/a","status":"fail","owner":"x","error":"boom"}\n' });
    const page = await app.request('/digest/2026-01-01');
    const html = await page.text();
    expect(page.status).toBe(200);
    const json = (await (await app.request('/api/digest/2026-01-01')).json()) as { rows: { job: string }[] };
    expect(json.rows.map((r) => r.job)).toEqual(['a/a', 'a/b']);
    expect(html.indexOf('a/a')).toBeLessThan(html.indexOf('a/b'));
    expect(html).toContain('—');
    expect(html).toContain('boom');
  });

  it('404 for a night with no file', async () => {
    const app = appWith({});
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const app = appWith({ '2026-01-01.jsonl': '' });
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
    expect(((await (await app.request('/api/digest/2026-01-01')).json()) as { rows: unknown[] }).rows).toEqual([]);
  });

  it('a bad line is counted, the night still renders', async () => {
    const app = appWith({ '2026-01-01.jsonl': good + '{"at":"2026\n' });
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('1 line(s) could not be read');
    expect(((await (await app.request('/api/digest/2026-01-01')).json()) as { badLines: number }).badLines).toBe(1);
  });

  it('retries of 3 or more are marked', async () => {
    const r = (s: string) => `{"at":"2026-01-01T01:00:00+01:00","job":"j","status":"${s}","owner":"x"}\n`;
    const app = appWith({ '2026-01-01.jsonl': r('retry') + r('retry') + r('retry') + r('ok') });
    expect(await (await app.request('/digest/2026-01-01')).text()).toContain('class="warn"');
  });

  it('status board links each night with counts', async () => {
    const res = await createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: 'runs' }).request('/');
    const html = await res.text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('ok 10 · retry 4 · fail 1');
  });
});
