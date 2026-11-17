import type { Night } from '../digest/types.js';

export function DigestPage({ data }: { data: Night }) {
  return (
    <>
      <h1>digest · {data.night}</h1>
      {data.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr><th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last status</th><th>last error</th><th>first</th><th>last</th></tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const flag = r.retries >= 3 || r.lastStatus === 'fail';
              return (
                <tr class={flag ? 'warn' : ''}>
                  <td>{r.job}</td>
                  <td>{r.owner ?? '—'}</td>
                  <td>{r.runs}</td>
                  <td>{r.retries}</td>
                  <td>{r.lastStatus}</td>
                  <td>{r.lastError ?? '—'}</td>
                  <td>{r.first}</td>
                  <td>{r.last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {data.badLines > 0 ? <p class="mute">{data.badLines} line(s) could not be read</p> : null}
    </>
  );
}
