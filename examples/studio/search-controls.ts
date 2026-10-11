import type { RecordController, CommentBatchPreview } from '@banora/sdk/controller';
import { searchRecord } from '@banora/sdk/record-search';
import type { RecordSearchHit } from '@banora/sdk/record-search';
import { describeDiagnosticFailure } from '@banora/sdk/diagnostics';
import type { StudioDiagnostics } from './diagnostics.js';
import { createUiMessages, formatUiMessage } from '@banora/sdk/locale';
import { getUiLocale, localizeUi, setUiText, subscribeUiLanguage } from '../ui-language.js';

/** Uses public SDK records/previews only; no saved query or implicit authored-data logging. */
export function mountSearchControls(
  host: HTMLElement,
  controller: RecordController,
  diagnostics?: StudioDiagnostics,
): () => void {
  host.innerHTML = `<button id="search-open" class="button" type="button">Search record</button>
    <dialog id="search-dialog" aria-labelledby="search-title"><h2 id="search-title">Search record</h2>
    <form id="search-form" class="search-actions"><label><span>Search text</span><input id="search-query" type="search" maxlength="512"/></label>
    <label><span>Search field</span><select id="search-field"><option value="all">Record text</option><option value="comments">Comments</option></select></label>
    <label><span>Page size</span><select id="search-limit"><option value="1">1</option><option value="20" selected>20</option><option value="50">50</option></select></label>
    <button class="button" type="submit">Search</button></form>
    <div class="search-actions"><button id="search-select-page" class="button" type="button">Select page</button><button id="search-clear" class="button" type="button">Clear selection</button>
    <span>Selected positions</span><span id="search-selected">0 / 256</span></div>
    <div id="search-results" role="list" tabindex="0" aria-label="Search results"></div>
    <div class="search-actions"><button id="search-previous" class="button" type="button">Previous page</button><span id="search-count"></span><button id="search-next" class="button" type="button">Next page</button></div>
    <label class="search-editor"><span>Edit comments</span><textarea id="search-comment" rows="3" maxlength="65536"></textarea></label>
    <div class="search-actions"><button id="search-preview" class="button" type="button">Preview changes</button><button id="search-apply" class="button primary" type="button" disabled>Apply changes</button><button id="search-cancel" class="button" type="button" hidden>Cancel preview</button></div>
    <div id="search-diff" role="list" tabindex="0" aria-label="Comment changes"></div><p id="search-status" role="status"></p>
    <div class="dialog-actions"><button id="search-close" class="button" type="button">Close</button></div></dialog>`;
  const find = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  const dialog = find<HTMLDialogElement>('search-dialog');
  const query = find<HTMLInputElement>('search-query');
  const field = find<HTMLSelectElement>('search-field');
  const limit = find<HTMLSelectElement>('search-limit');
  const text = find<HTMLTextAreaElement>('search-comment');
  const status = find('search-status');
  const selected = new Map<string, { gameIndex: number; moveNumber: number }>();
  const select = (hit: RecordSearchHit) =>
    selected.set(hit.nodeId, {
      gameIndex: hit.target.gameIndex,
      moveNumber: hit.moveNumber,
    });
  let hits: readonly RecordSearchHit[] = [],
    offset = 0;
  let preview: CommentBatchPreview | undefined;
  let navigationClose = false;
  let disposed = false;
  let previous = controller.getState(),
    applying = false;
  const abort = new AbortController(),
    { signal } = abort;
  const disposeStatic = localizeUi(host);
  const title = (game: number, move: number) => {
    const ui = createUiMessages({ locale: getUiLocale() });
    return `${formatUiMessage(ui.game, { number: game + 1 })} · ${formatUiMessage(ui.move, { number: move })}`;
  };
  function controls() {
    find('search-selected').textContent = `${selected.size} / 256`;
    find<HTMLButtonElement>('search-preview').disabled = !selected.size;
    find<HTMLButtonElement>('search-apply').disabled = !preview?.edits.length;
    find('search-cancel').hidden = !preview;
    find<HTMLButtonElement>('search-clear').disabled = !selected.size;
    find<HTMLButtonElement>('search-select-page').disabled = !hits.length || selected.size >= 256;
    for (const checkbox of find('search-results').querySelectorAll<HTMLInputElement>('input')) {
      checkbox.checked = selected.has(checkbox.dataset.node!);
      checkbox.disabled = !checkbox.checked && selected.size >= 256;
    }
  }
  function discardPreview() {
    preview = undefined;
    find('search-diff').replaceChildren();
    controls();
  }
  function closeSearch() {
    // Native close is queued; revoke approval before leaving the dialog.
    discardPreview();
    dialog.close();
  }
  function pruneSelection() {
    const missing = new Set(selected.keys());
    const pending = [...controller.getState().record.games];
    while (pending.length && missing.size) {
      const node = pending.pop()!;
      missing.delete(node.id);
      pending.push(...node.children);
    }
    for (const id of missing) selected.delete(id);
  }
  function renderResults() {
    const generation = controller.getState().recordGeneration;
    const fragment = document.createDocumentFragment();
    if (!hits.length) {
      const empty = document.createElement('p');
      setUiText(empty, 'No results');
      fragment.append(empty);
    }
    for (const hit of hits) {
      const row = document.createElement('div');
      row.className = 'search-result';
      row.setAttribute('role', 'listitem');
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.node = hit.nodeId;
      const caption = document.createElement('span');
      caption.textContent = title(hit.target.gameIndex, hit.moveNumber);
      label.append(checkbox, caption);
      checkbox.addEventListener('change', () => {
        if (disposed || generation !== controller.getState().recordGeneration) return;
        if (checkbox.checked && selected.size < 256) select(hit);
        else selected.delete(hit.nodeId);
        discardPreview();
        setUiText(status, '');
      });
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'button';
      setUiText(go, 'Go to position');
      go.addEventListener('click', () => {
        if (disposed || generation !== controller.getState().recordGeneration) return;
        const result = controller.goTo(hit.nodeId);
        if (!result.ok) {
          setUiText(status, 'Record changed. Search again.');
          return;
        }
        navigationClose = true;
        closeSearch();
      });
      const excerpt = document.createElement('p');
      excerpt.textContent = hit.excerpt;
      row.append(label, go, excerpt);
      fragment.append(row);
    }
    find('search-results').replaceChildren(fragment);
    controls();
  }
  function search() {
    const complete = diagnostics?.begin('search');
    try {
      const options = {
        query: query.value,
        ...(field.value === 'comments' ? { properties: ['C'] } : {}),
        offset,
        limit: Number(limit.value),
      };
      let result = searchRecord(controller.getState().record, options);
      if (!result.total) offset = 0;
      else if (offset >= result.total) {
        offset = Math.floor((result.total - 1) / options.limit) * options.limit;
        result = searchRecord(controller.getState().record, { ...options, offset });
      }
      hits = result.hits;
      find('search-count').textContent =
        `${hits.length ? offset + 1 : 0}–${offset + hits.length} / ${result.total}`;
      find<HTMLButtonElement>('search-previous').disabled = offset === 0;
      find<HTMLButtonElement>('search-next').disabled = !result.hasMore;
      renderResults();
      complete?.({ status: 'success' });
    } catch (error) {
      complete?.({
        status: 'failure',
        failure: describeDiagnosticFailure(
          'sgf',
          error instanceof RangeError ? 'limit' : 'property',
        ),
      });
      hits = [];
      find('search-count').textContent = '';
      find<HTMLButtonElement>('search-previous').disabled = find<HTMLButtonElement>(
        'search-next',
      ).disabled = true;
      renderResults();
      setUiText(status, 'Narrow search or reduce page size.');
    }
  }
  find('search-open').addEventListener(
    'click',
    () => {
      setUiText(status, '');
      pruneSelection();
      search();
      dialog.showModal();
      query.focus();
    },
    { signal },
  );
  find('search-form').addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      offset = 0;
      setUiText(status, '');
      search();
    },
    { signal },
  );
  for (const input of [query, field, limit])
    input.addEventListener(
      'change',
      () => {
        offset = 0;
        setUiText(status, '');
        search();
      },
      { signal },
    );
  find('search-previous').addEventListener(
    'click',
    () => {
      offset = Math.max(0, offset - Number(limit.value));
      search();
    },
    { signal },
  );
  find('search-next').addEventListener(
    'click',
    () => {
      offset += Number(limit.value);
      search();
    },
    { signal },
  );
  find('search-select-page').addEventListener(
    'click',
    () => {
      for (const hit of hits) {
        if (selected.size >= 256) break;
        select(hit);
      }
      discardPreview();
      setUiText(status, '');
    },
    { signal },
  );
  find('search-clear').addEventListener(
    'click',
    () => {
      selected.clear();
      discardPreview();
      setUiText(status, '');
    },
    { signal },
  );
  text.addEventListener(
    'input',
    () => {
      discardPreview();
      setUiText(status, '');
    },
    { signal },
  );
  find('search-preview').addEventListener(
    'click',
    () => {
      discardPreview();
      const result = controller.previewComments(
        [...selected.keys()].map((nodeId) => ({ nodeId, text: text.value })),
      );
      diagnostics?.record(
        result.ok
          ? { operation: 'batch', status: 'success' }
          : {
              operation: 'batch',
              status: 'failure',
              failure: describeDiagnosticFailure('controller', result.reason),
            },
      );
      if (!result.ok) {
        setUiText(
          status,
          result.reason === 'limit'
            ? 'Select fewer positions or shorten the comment.'
            : 'Record changed. Search again.',
        );
        return;
      }
      preview = result.preview;
      const fragment = document.createDocumentFragment();
      for (const edit of preview.edits) {
        const row = document.createElement('section');
        row.className = 'search-change';
        row.setAttribute('role', 'listitem');
        const position = document.createElement('p');
        const hit = selected.get(edit.nodeId)!;
        position.dataset.searchPosition = edit.nodeId;
        position.textContent = title(hit.gameIndex, hit.moveNumber);
        const before = document.createElement('pre'),
          after = document.createElement('pre');
        const beforeLabel = document.createElement('strong'),
          afterLabel = document.createElement('strong');
        setUiText(beforeLabel, 'Before');
        setUiText(afterLabel, 'After');
        before.textContent = edit.before;
        after.textContent = edit.after;
        row.append(position, beforeLabel, before, afterLabel, after);
        fragment.append(row);
      }
      find('search-diff').replaceChildren(fragment);
      setUiText(status, preview.edits.length ? '' : 'No changes');
      controls();
    },
    { signal },
  );
  find('search-cancel').addEventListener(
    'click',
    () => {
      discardPreview();
      setUiText(status, '');
    },
    { signal },
  );
  find('search-apply').addEventListener(
    'click',
    () => {
      if (!preview) return;
      const approved = preview;
      applying = true;
      try {
        const result = controller.applyComments(approved);
        diagnostics?.record(
          result.ok
            ? { operation: 'batch', status: 'success' }
            : {
                operation: 'batch',
                status: 'failure',
                failure: describeDiagnosticFailure('controller', result.reason),
              },
        );
        discardPreview();
        if (result.ok) {
          selected.clear();
          search();
          setUiText(status, 'Comments updated.');
        } else setUiText(status, 'Record changed. Preview again.');
        controls();
      } finally {
        applying = false;
      }
    },
    { signal },
  );
  find('search-close').addEventListener('click', closeSearch, { signal });
  dialog.addEventListener('cancel', discardPreview, { signal });
  dialog.addEventListener(
    'close',
    () => {
      discardPreview();
      if (navigationClose)
        document.querySelector<SVGSVGElement>('#board svg[role="application"]')?.focus();
      else if (find('search-open').getClientRects().length)
        find('search-open').focus({ preventScroll: true });
      else document.getElementById('board-menu')?.focus({ preventScroll: true });
      navigationClose = false;
    },
    { signal },
  );
  const unsubscribe = controller.subscribe((state) => {
    const changed = previous.record !== state.record;
    const imported = previous.recordGeneration !== state.recordGeneration;
    previous = state;
    if (!changed) return;
    const hadPreview = !!preview;
    if (imported) {
      selected.clear();
      offset = 0;
      hits = [];
      find('search-results').replaceChildren();
      find('search-count').textContent = '';
    } else if (selected.size && dialog.open) pruneSelection();
    discardPreview();
    if (dialog.open && !applying) {
      search();
      if (hadPreview && !applying) setUiText(status, 'Record changed. Preview again.');
    }
  });
  const disposeLanguage = subscribeUiLanguage(() => {
    renderResults();
    for (const position of find('search-diff').querySelectorAll<HTMLElement>(
      '[data-search-position]',
    )) {
      const hit = selected.get(position.dataset.searchPosition!)!;
      position.textContent = title(hit.gameIndex, hit.moveNumber);
    }
    // Static and SDK-owned labels translate; authored before/after text stays literal.
  });
  controls();
  return () => {
    disposed = true;
    abort.abort();
    unsubscribe();
    disposeLanguage();
    disposeStatic();
    dialog.close();
    host.replaceChildren();
  };
}
