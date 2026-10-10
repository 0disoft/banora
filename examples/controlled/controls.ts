import './style.css';
import type { Host } from './host.js';

export function attachControls(host: Host, framework: string) {
  document.title = `Banora controlled board — ${framework}`;
  const controls = document.querySelector<HTMLElement>('#controls')!;
  controls.innerHTML = `<h1>Host-controlled board · ${framework}</h1>
    <p>The host owns the position. Click a point, then approve or reject its intention.
    This simulator does not enforce Go rules.</p>
    <nav><a href="./index.html">Vanilla</a> · <a href="./react.html">React</a> ·
    <a href="./vue.html">Vue</a> · <a href="./svelte.html">Svelte</a></nav>
    <div class="controls"><button id="approve">Approve intention</button><button id="reject">Reject intention</button>
    <button id="replace">Replace snapshot</button><button id="toggle-mount">Toggle mounted board</button>
    <button id="toggle-readonly">Toggle read-only</button><button id="toggle-callback">Switch callback</button>
    <button id="toggle-confirm">Toggle touch confirmation</button>
    <button id="svg-export">Export SVG</button><button id="png-export">Export PNG</button></div>
    <dl><dt>Host key</dt><dd id="state-key"></dd><dt>Pending intention</dt><dd id="pending"></dd>
    <dt>Last callback</dt><dd id="callback"></dd></dl><p id="message" role="status"></p>`;
  const actions = {
    approve: host.approve,
    reject: host.reject,
    replace: host.replace,
    'toggle-mount': host.toggleMount,
    'toggle-readonly': host.toggleReadOnly,
    'toggle-callback': host.toggleCallback,
    'toggle-confirm': host.toggleConfirm,
  };
  const abort = new AbortController();
  for (const [id, action] of Object.entries(actions))
    document.querySelector(`#${id}`)!.addEventListener('click', action, { signal: abort.signal });
  const render = () => {
    const session = host.getState();
    document.querySelector('#state-key')!.textContent = session.board.key;
    document.querySelector('#pending')!.textContent = session.pending
      ? JSON.stringify(session.pending)
      : 'none';
    document.querySelector('#callback')!.textContent = session.callback || 'none';
    document.querySelector('#message')!.textContent = session.message;
    document
      .querySelector('#toggle-readonly')!
      .setAttribute('aria-pressed', String(session.readOnly));
    document
      .querySelector('#toggle-confirm')!
      .setAttribute('aria-pressed', String(session.confirm));
    for (const id of ['svg-export', 'png-export'])
      (document.querySelector(`#${id}`) as HTMLButtonElement).disabled = !session.mounted;
  };
  const download = async (png: boolean) => {
    const view = host.getView();
    if (!view) return;
    try {
      const file = png
        ? await view.exportPng()
        : new Blob([view.exportSvg()], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(file),
        link = document.createElement('a');
      link.href = url;
      link.download = `controlled-${framework.toLowerCase()}.${png ? 'png' : 'svg'}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      document.querySelector('#message')!.textContent =
        `Diagram export failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  };
  document
    .querySelector('#svg-export')!
    .addEventListener('click', () => void download(false), { signal: abort.signal });
  document
    .querySelector('#png-export')!
    .addEventListener('click', () => void download(true), { signal: abort.signal });
  const stop = host.subscribe(render);
  render();
  return () => {
    stop();
    abort.abort();
  };
}
