import type { DiagnosticOperation, DiagnosticRecovery } from '@0disoft/banora/diagnostics';
import type { StudioDiagnostics } from './diagnostics.js';
import {
  getUiLocale,
  localizeUi,
  setUiText,
  subscribeUiLanguage,
  translateUi,
} from '../ui-language.js';

const actions = [
  ['open', 'Open SGF', 'Open a local SGF file.'],
  ['sample', 'Example game', 'Open the sample record.'],
  ['new', 'New record', 'Create an empty board.'],
  ['export', 'Export SGF', 'Download the current record.'],
  ['search-open', 'Search record', 'Find positions and edit selected comments.'],
  ['drafts-open', 'Local drafts', 'Resume, back up or delete local drafts.'],
  ['@preferences', 'Settings', 'Reset saved display settings.'],
  ['theme', 'Board theme', 'Choose a board theme.'],
  ['board-size', 'Display size', 'Change the board display size.'],
  ['@tools', 'Tool', 'Choose an editing tool.'],
  ['@view', 'View', 'Rotate or reflect the board.'],
  ['@touch', 'Touch placement', 'Change touch placement settings.'],
  ['@animation', 'Animation', 'Change stone animation settings.'],
  ['@textures', 'Stone textures', 'Choose stone images.'],
  ['@comparison', 'Compare positions', 'Compare two positions.'],
  ['@share', 'Share', 'Create a share link.'],
  ['@scoring', 'Score position', 'Count the current position.'],
] as const;
const operationText: Record<DiagnosticOperation, string> = {
  import: 'Open SGF',
  export: 'Export SGF',
  navigate: 'Navigation',
  edit: 'Edit',
  batch: 'Edit comments',
  search: 'Search',
  scoring: 'Score position',
  analysis: 'Analysis',
  checkpoint: 'Autosave',
  restore: 'Restore draft',
  backup: 'Download backup',
  preferences: 'Settings',
  diagram: 'Diagram',
  share: 'Share',
  puzzle: 'Puzzle',
};
const recoveryText: Record<DiagnosticRecovery, string> = {
  'correct-input': 'Check the input.',
  'choose-position': 'Choose another position.',
  'review-changes': 'Review changes.',
  'reopen-source': 'Check the file.',
  'check-storage': 'Check local storage.',
  'check-provider': 'Check the provider.',
  wait: 'Wait, then retry.',
  retry: 'Retry after checking state.',
  report: 'Report the issue.',
  none: '',
};
export function mountSupportControls(
  host: HTMLElement,
  diagnostics: StudioDiagnostics,
): () => void {
  host.innerHTML = `<button id="support-open" class="button" type="button">Help</button>
    <dialog id="support-dialog" aria-labelledby="support-title"><h2 id="support-title">Help</h2>
    <label class="support-filter"><span>Find action</span><input id="support-query" type="search" maxlength="128"/></label>
    <div id="support-actions" role="list" aria-label="Actions"></div>
    <p><a href="https://github.com/0disoft/banora/issues" target="_blank" rel="noopener noreferrer">Issues</a></p>
    <details id="diagnostic-panel"><summary>Diagnostics</summary>
    <div class="draft-actions"><label><input id="diagnostic-enabled" type="checkbox"/><span>Enable local diagnostics</span></label></div>
    <p class="muted small">Session only; record text excluded.</p>
    <div class="draft-actions"><button id="diagnostic-clear" class="button" type="button">Clear diagnostics</button><button id="diagnostic-download" class="button" type="button">Download diagnostics</button><span id="diagnostic-count"></span></div>
    <div id="diagnostic-summary"></div><div id="diagnostic-events" role="list" tabindex="0" aria-label="Diagnostic events"></div>
    <details><summary>JSON</summary><pre id="diagnostic-json"></pre></details>
    <p id="diagnostic-status" role="status"></p></details>
    <div class="dialog-actions"><button id="support-close" class="button" type="button">Close</button></div></dialog>`;
  const find = <T extends HTMLElement>(id: string): T =>
    (host.querySelector<T>(`#${id}`) ?? dialog.querySelector<T>(`#${id}`))!;
  const dialog: HTMLDialogElement = find<HTMLDialogElement>('support-dialog');
  const query = find<HTMLInputElement>('support-query');
  const toggle = find<HTMLInputElement>('diagnostic-enabled');
  const abort = new AbortController();
  const { signal } = abort;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let disposed = false;
  let launched = false;
  // Modal ownership is independent of the temporarily borrowed menu controls.
  document.body.append(dialog);
  const disposeStatic = localizeUi(host);
  const disposeModalLanguage = localizeUi(dialog);
  function renderActions() {
    const term = query.value.trim().toLocaleLowerCase(getUiLocale());
    const fragment = document.createDocumentFragment();
    for (const [id, label, description] of actions) {
      if (
        !`${translateUi(label)} ${translateUi(description)} ${label}`
          .toLocaleLowerCase(getUiLocale())
          .includes(term)
      )
        continue;
      const row = document.createElement('div');
      row.className = 'support-action';
      row.setAttribute('role', 'listitem');
      const button = document.createElement('button');
      button.className = 'button';
      button.type = 'button';
      setUiText(button, label);
      button.addEventListener('click', () => {
        if (disposed) return;
        const target = id.startsWith('@')
          ? document.getElementById('board-menu')
          : document.getElementById(id);
        if (!target) return;
        launched = true;
        dialog.close();
        if (id.startsWith('@')) {
          const panel = document.getElementById('board-menu-panel')!;
          if (!panel.matches(':popover-open')) target.click();
          const section = id.slice(1);
          const setting = { view: 'rotation', touch: 'touch-mode', animation: 'animation' }[
            section as 'view' | 'touch' | 'animation'
          ];
          const destination = section === 'view' ? 'preferences' : section;
          panel
            .querySelector<HTMLButtonElement>(`[data-board-menu-section="${destination}"]`)
            ?.click();
          if (setting) document.getElementById(setting)?.focus({ preventScroll: true });
        } else if (target instanceof HTMLSelectElement) {
          if (!target.checkVisibility()) {
            const panel = document.getElementById('board-menu-panel')!;
            if (!panel.matches(':popover-open')) document.getElementById('board-menu')!.click();
            panel
              .querySelector<HTMLButtonElement>('[data-board-menu-section="preferences"]')!
              .click();
          }
          target.focus({ preventScroll: true });
        } else target.click();
      });
      const detail = document.createElement('span');
      setUiText(detail, description);
      row.append(button, detail);
      fragment.append(row);
    }
    if (!fragment.childNodes.length) {
      const empty = document.createElement('p');
      setUiText(empty, 'No results');
      fragment.append(empty);
    }
    find('support-actions').replaceChildren(fragment);
  }
  function refresh() {
    toggle.checked = diagnostics.enabled;
    find<HTMLButtonElement>('diagnostic-download').disabled =
      !diagnostics.enabled || timers.size >= 4;
    if (!dialog.open) {
      find('diagnostic-count').textContent = '';
      find<HTMLButtonElement>('diagnostic-clear').disabled = true;
      for (const id of ['diagnostic-summary', 'diagnostic-events', 'diagnostic-json'])
        find(id).replaceChildren();
      return;
    }
    const report = diagnostics.createReport(getUiLocale());
    find<HTMLButtonElement>('diagnostic-clear').disabled = !report.events.length;
    find('diagnostic-count').textContent =
      `${translateUi('Events')} ${report.events.length} / ${report.capacity} · ${translateUi('Omitted')} ${report.dropped}`;
    const summary = document.createDocumentFragment();
    for (const row of report.summary) {
      const line = document.createElement('p');
      line.textContent = `${translateUi(operationText[row.operation])} · ${translateUi('Success')} ${row.success} · ${translateUi('Failure')} ${row.failure} · ${translateUi('Cancelled')} ${row.cancelled}${row.timed ? ` · ${translateUi('Max duration')} ${row.durationMaxMs} ms` : ''}`;
      summary.append(line);
    }
    find('diagnostic-summary').replaceChildren(summary);
    const events = document.createDocumentFragment();
    for (const event of report.events) {
      const row = document.createElement('div');
      row.className = 'diagnostic-event';
      row.setAttribute('role', 'listitem');
      row.textContent = `${event.id} · ${translateUi(operationText[event.operation])} · ${translateUi({ success: 'Success', failure: 'Failure', cancelled: 'Cancelled' }[event.status])}${event.failure ? ` · ${event.failure.domain}/${event.failure.code} · ${translateUi(recoveryText[event.failure.recovery])}` : ''}`;
      events.append(row);
    }
    if (!report.events.length) {
      const empty = document.createElement('p');
      setUiText(empty, 'No diagnostic events');
      events.append(empty);
    }
    find('diagnostic-events').replaceChildren(events);
    find('diagnostic-json').textContent = JSON.stringify(report, null, 2);
  }
  find('support-open').addEventListener(
    'click',
    () => {
      dialog.showModal();
      renderActions();
      refresh();
      query.focus();
    },
    { signal },
  );
  query.addEventListener('input', renderActions, { signal });
  toggle.addEventListener(
    'change',
    () => {
      diagnostics.setEnabled(toggle.checked);
      setUiText(find('diagnostic-status'), '');
    },
    { signal },
  );
  find('diagnostic-clear').addEventListener(
    'click',
    () => {
      diagnostics.clear();
      setUiText(find('diagnostic-status'), '');
    },
    { signal },
  );
  find('support-close').addEventListener('click', () => dialog.close(), { signal });
  dialog.addEventListener(
    'close',
    () => {
      refresh();
      if (!launched && !document.querySelector('dialog:modal')) {
        const opener = find('support-open');
        (opener.getClientRects().length ? opener : document.getElementById('board-menu'))?.focus({
          preventScroll: true,
        });
      }
      launched = false;
    },
    { signal },
  );
  find('diagnostic-download').addEventListener(
    'click',
    () => {
      if (!diagnostics.enabled || timers.size >= 4) return;
      let url: string | undefined;
      let link: HTMLAnchorElement | undefined;
      try {
        url = URL.createObjectURL(
          new Blob([JSON.stringify(diagnostics.createReport(getUiLocale()), null, 2)], {
            type: 'application/json;charset=utf-8',
          }),
        );
        link = document.createElement('a');
        link.href = url;
        link.download = 'banora-diagnostics.json';
        dialog.append(link);
        link.click();
        const current = url;
        timers.set(
          current,
          setTimeout(() => {
            URL.revokeObjectURL(current);
            timers.delete(current);
            if (!disposed) refresh();
          }, 30_000),
        );
        refresh();
        setUiText(find('diagnostic-status'), 'Diagnostic download started.');
      } catch {
        if (url) URL.revokeObjectURL(url);
        setUiText(find('diagnostic-status'), 'Could not download diagnostics.');
      } finally {
        link?.remove();
      }
    },
    { signal },
  );
  const unsubscribe = diagnostics.subscribe(refresh);
  const disposeLanguage = subscribeUiLanguage(() => {
    renderActions();
    refresh();
  });
  refresh();
  return () => {
    disposed = true;
    abort.abort();
    unsubscribe();
    disposeLanguage();
    disposeStatic();
    dialog.close();
    for (const [url, timer] of timers) {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    }
    timers.clear();
    disposeModalLanguage();
    dialog.remove();
    host.replaceChildren();
  };
}
