import { mountControlledBoard } from '@0disoft/banora/controlled-board';
import type { ControlledBoardView } from '@0disoft/banora/controlled-board';
import { mountPuzzle } from '@0disoft/banora/puzzle-view';
import type { PuzzleView } from '@0disoft/banora/puzzle-view';
import { createBoardLabels } from '@0disoft/banora/locale';
import { pointToSgf } from '@0disoft/banora/sgf';
import type { ControllerState, RecordController } from '@0disoft/banora/controller';
import { getUiLocale, subscribeUiLanguage } from '../ui-language.js';
import { coordinateTitle } from './setup-editing.js';
import { authorMessages } from './puzzle-author-language.js';
import type { AuthorMessages } from './puzzle-author-language.js';
import {
  createPuzzleDraft,
  exportPuzzleDraft,
  initialPuzzleEdits,
  puzzleDraftPosition,
  PuzzleDraftError,
} from './puzzle-draft.js';
import type { PuzzleDraft, PuzzleDraftNode, PuzzleNodeEdit } from './puzzle-draft.js';
import './puzzle-author-controls.css';

/** A dialog-owned draft and preview. The borrowed Studio controller is never edited. */
export function mountPuzzleAuthorControls(
  host: HTMLElement,
  controller: RecordController,
): () => void {
  const opener = document.createElement('button');
  opener.id = 'puzzle-author-open';
  opener.type = 'button';
  opener.className = 'button';
  opener.dataset.authorText = 'create';
  host.append(opener);
  const dialog = document.createElement('dialog');
  dialog.id = 'puzzle-author-dialog';
  dialog.setAttribute('aria-labelledby', 'puzzle-author-title');
  dialog.innerHTML = `<form novalidate><h2 id="puzzle-author-title" data-author-text="create"></h2>
    <p class="small muted" data-author-text="intro"></p>
    <div class="puzzle-author-fields">
      <label><span data-author-text="id"></span><input id="puzzle-author-id" maxlength="64" required></label>
      <label><span data-author-text="title"></span><input id="puzzle-author-name" maxlength="256" required autofocus></label>
      <label><span data-author-text="player"></span><output id="puzzle-author-player"></output></label>
      <label class="puzzle-author-question"><span data-author-text="question"></span><textarea id="puzzle-author-question" rows="2" maxlength="4096" required></textarea></label>
    </div>
    <div class="puzzle-author-layout"><section class="puzzle-author-answers">
      <label for="puzzle-author-tree" data-author-text="answers"></label>
      <select id="puzzle-author-tree" size="9"></select>
      <label><span data-author-text="outcome"></span><select id="puzzle-author-outcome">
        <option value="continue" data-author-text="continue"></option><option value="correct" data-author-text="correct"></option>
        <option value="incorrect" data-author-text="incorrect"></option><option value="exclude" data-author-text="exclude"></option></select></label>
      <label id="puzzle-author-reply-field"><span data-author-text="reply"></span><select id="puzzle-author-reply"></select></label>
      <label><span data-author-text="feedback"></span><textarea id="puzzle-author-feedback" rows="2" maxlength="4096"></textarea></label>
      <label><span data-author-text="hint"></span><textarea id="puzzle-author-hint" rows="2" maxlength="4096"></textarea></label>
    </section><section class="puzzle-author-preview"><h3 data-author-text="board"></h3><div id="puzzle-author-board"></div></section></div>
    <p id="puzzle-author-status" role="status"></p>
    <p class="small muted" data-author-text="sourceNote"></p>
    <div class="dialog-actions"><button id="puzzle-author-close" class="button" type="button" data-author-text="close"></button>
      <button id="puzzle-author-test" class="button" type="button" data-author-text="test"></button>
      <button id="puzzle-author-edit" class="button" type="button" data-author-text="edit" hidden></button>
      <button id="puzzle-author-download" class="button primary" type="submit" data-author-text="download"></button></div></form>`;
  document.body.append(dialog);
  const find = <T extends HTMLElement>(name: string) =>
    dialog.querySelector<T>(`#puzzle-author-${name}`)!;
  const tree = find<HTMLSelectElement>('tree'),
    outcome = find<HTMLSelectElement>('outcome'),
    reply = find<HTMLSelectElement>('reply');
  const feedback = find<HTMLTextAreaElement>('feedback'),
    hint = find<HTMLTextAreaElement>('hint');
  const id = find<HTMLInputElement>('id'),
    title = find<HTMLInputElement>('name'),
    question = find<HTMLTextAreaElement>('question');
  const test = find<HTMLButtonElement>('test'),
    download = find<HTMLButtonElement>('download'),
    editButton = find<HTMLButtonElement>('edit');
  const boardHost = find('board'),
    status = find('status');
  const abort = new AbortController(),
    { signal } = abort;
  const urls = new Map<string, ReturnType<typeof setTimeout>>();
  let source: ControllerState | undefined, draft: PuzzleDraft | undefined;
  let nodes = new Map<string, PuzzleDraftNode>(),
    edits = new Map<string, PuzzleNodeEdit>();
  let selected = 'root',
    message: keyof AuthorMessages | undefined;
  let board: ControlledBoardView | undefined, preview: PuzzleView | undefined;
  const text = () => authorMessages[getUiLocale()];
  function announce(key?: keyof AuthorMessages) {
    message = key;
    status.textContent = key ? text()[key] : '';
  }
  function disposeViews() {
    preview?.dispose();
    preview = undefined;
    board?.dispose();
    board = undefined;
    boardHost.replaceChildren();
    editButton.hidden = true;
  }
  function clear() {
    disposeViews();
    source = undefined;
    draft = undefined;
    nodes.clear();
    edits.clear();
    tree.replaceChildren();
    for (const field of [id, title, question, feedback, hint]) field.value = '';
    find('player').textContent = '';
    reply.replaceChildren();
    announce();
    for (const [url, timer] of urls) {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    }
    urls.clear();
  }
  function close() {
    clear();
    if (dialog.open) dialog.close();
  }
  function rowLabel(node: PuzzleDraftNode): string {
    const t = text();
    if (!node.parent) return t.initial;
    const at = node.unsupported
      ? t.positionEdit
      : node.move === null
        ? t.pass
        : coordinateTitle(pointToSgf(node.move!), draft!.position.height);
    return `${node.depth} · ${node.color ? `${node.color === 'black' ? '●' : '○'} ${t[node.color]} ` : ''}${at} · ${t[edits.get(node.id)!.kind]}`;
  }
  function refreshRows() {
    if (!draft) return;
    const blocked = new Map<string, boolean>();
    for (const node of draft.nodes) {
      const parentBlocked =
        node.parent !== null &&
        (blocked.get(node.parent) || edits.get(node.parent)!.kind !== 'continue');
      blocked.set(node.id, !!parentBlocked);
      const option = tree.namedItem(node.id) as HTMLOptionElement | null;
      if (option) {
        option.textContent = `${'\u00a0'.repeat(Math.min(node.depth, 8) * 2)}${rowLabel(node)}`;
        option.disabled = !!parentBlocked;
      }
    }
  }
  function showBoard() {
    if (!draft) return;
    preview?.dispose();
    preview = undefined;
    editButton.hidden = true;
    try {
      const selectedNode = nodes.get(selected)!;
      const target =
        edits.get(selected)!.kind === 'exclude' ? (selectedNode.parent ?? 'root') : selected;
      const position = puzzleDraftPosition(draft, target),
        node = nodes.get(target)!;
      const state = {
        key: `${selected}/${target}`,
        width: position.width,
        height: position.height,
        stones: position.board,
        toPlay: position.toPlay,
        moveNumber: position.moveNumber,
        captures: position.captures,
        lastMove: node.move ?? null,
      };
      if (board) board.update({ state });
      else
        board = mountControlledBoard(boardHost, {
          state,
          readOnly: true,
          coordinates: true,
          labels: createBoardLabels({ locale: getUiLocale() }),
        });
    } catch (error) {
      board?.dispose();
      board = undefined;
      boardHost.replaceChildren();
      announce(error instanceof PuzzleDraftError ? error.code : 'invalid');
    }
  }
  function details() {
    if (!draft) return;
    const node = nodes.get(selected)!,
      value = edits.get(selected)!;
    tree.value = selected;
    outcome.value = value.kind;
    outcome.disabled = node.parent === null;
    for (const option of outcome.options)
      option.disabled =
        node.unsupported && option.value !== 'continue' && option.value !== 'exclude';
    feedback.value = value.feedback;
    hint.value = value.hint;
    const replyOptions = [new Option(text().choose, '')];
    for (const child of node.children)
      if (edits.get(child)!.kind !== 'exclude')
        replyOptions.push(new Option(rowLabel(nodes.get(child)!), child));
    reply.replaceChildren(...replyOptions);
    reply.value = value.response;
    reply.disabled = node.unsupported || value.kind !== 'continue' || node.depth % 2 === 0;
    showBoard();
  }
  function invalidate() {
    if (!draft) return;
    announce();
    if (preview) showBoard();
  }
  function live() {
    if (!source || !dialog.open || controller.getState() !== source) {
      if (dialog.open) close();
      return false;
    }
    return !!draft;
  }
  function artifact() {
    if (!live()) return undefined;
    try {
      return exportPuzzleDraft(
        draft!,
        { id: id.value, title: title.value, prompt: question.value },
        edits,
      );
    } catch (error) {
      if (error instanceof PuzzleDraftError && error.nodeId && nodes.has(error.nodeId)) {
        selected = error.nodeId;
        details();
      }
      announce(error instanceof PuzzleDraftError ? error.code : 'invalid');
      return undefined;
    }
  }
  function language() {
    for (const element of [opener, ...dialog.querySelectorAll<HTMLElement>('[data-author-text]')])
      element.textContent = text()[element.dataset.authorText as keyof AuthorMessages];
    if (source) find('player').textContent = text()[source.position.toPlay];
    refreshRows();
    if (draft) {
      const selectedReply = edits.get(selected)!.response;
      reply.options[0]!.textContent = text().choose;
      for (const option of [...reply.options].slice(1))
        option.textContent = rowLabel(nodes.get(option.value)!);
      reply.value = selectedReply;
    }
    announce(message);
    board?.update({ labels: createBoardLabels({ locale: getUiLocale() }) });
    preview?.update({ locale: getUiLocale() });
  }
  opener.addEventListener(
    'click',
    () => {
      clear();
      source = controller.getState();
      id.value = 'studio-puzzle';
      title.value = source.record.games[source.gameIndex]!.properties.GN?.[0] ?? '';
      question.value = source.node.properties.C?.join('\n') ?? '';
      find('player').textContent = text()[source.position.toPlay];
      try {
        draft = createPuzzleDraft(source);
        edits = initialPuzzleEdits(draft);
        nodes = new Map(draft.nodes.map((node) => [node.id, node]));
        selected = 'root';
        tree.replaceChildren(
          ...draft.nodes.map((node) => {
            const option = new Option('', node.id);
            option.id = node.id;
            return option;
          }),
        );
        refreshRows();
        details();
        test.disabled = false;
        download.disabled = false;
      } catch (error) {
        test.disabled = true;
        download.disabled = true;
        announce(error instanceof PuzzleDraftError ? error.code : 'invalid');
      }
      if (!dialog.open) dialog.showModal();
    },
    { signal },
  );
  tree.addEventListener(
    'change',
    () => {
      if (!live()) return;
      selected = tree.value;
      announce();
      details();
    },
    { signal },
  );
  outcome.addEventListener(
    'change',
    () => {
      if (!live()) return;
      edits.get(selected)!.kind = outcome.value as PuzzleNodeEdit['kind'];
      if (outcome.value === 'exclude')
        for (const value of edits.values()) if (value.response === selected) value.response = '';
      invalidate();
      refreshRows();
      details();
    },
    { signal },
  );
  reply.addEventListener(
    'change',
    () => {
      if (live()) {
        edits.get(selected)!.response = reply.value;
        invalidate();
      }
    },
    { signal },
  );
  for (const [field, key] of [
    [feedback, 'feedback'],
    [hint, 'hint'],
  ] as const)
    field.addEventListener(
      'input',
      () => {
        if (live()) {
          edits.get(selected)![key] = field.value;
          invalidate();
        }
      },
      { signal },
    );
  for (const field of [id, title, question])
    field.addEventListener('input', invalidate, { signal });
  test.addEventListener(
    'click',
    () => {
      const value = artifact();
      if (!value) return;
      disposeViews();
      try {
        preview = mountPuzzle(boardHost, { definition: value.definition, locale: getUiLocale() });
        editButton.hidden = false;
        announce('valid');
      } catch {
        announce('invalid');
      }
    },
    { signal },
  );
  editButton.addEventListener(
    'click',
    () => {
      if (live()) {
        announce();
        showBoard();
      }
    },
    { signal },
  );
  dialog.querySelector('form')!.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      const value = artifact();
      if (!value) return;
      const link = document.createElement('a');
      let url: string | undefined;
      try {
        url = URL.createObjectURL(
          new Blob([value.json], { type: 'application/json;charset=utf-8' }),
        );
        link.href = url;
        link.download = `${value.definition.id}.puzzle.json`;
        dialog.append(link);
        link.click();
        const captured = url;
        urls.set(
          captured,
          setTimeout(() => {
            URL.revokeObjectURL(captured);
            urls.delete(captured);
          }, 1000),
        );
        announce('valid');
      } catch {
        if (url) URL.revokeObjectURL(url);
        announce('downloadError');
      } finally {
        link.remove();
      }
    },
    { signal },
  );
  find('close').addEventListener('click', close, { signal });
  dialog.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault();
      close();
    },
    { signal },
  );
  dialog.addEventListener(
    'close',
    () => {
      if (!dialog.open) clear();
    },
    { signal },
  );
  const unsubscribe = controller.subscribe((state) => {
    if (source && state !== source) close();
  });
  const stopLanguage = subscribeUiLanguage(language);
  language();
  return () => {
    close();
    abort.abort();
    unsubscribe();
    stopLanguage();
    dialog.remove();
    opener.remove();
  };
}
