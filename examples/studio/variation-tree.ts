import { getVariationRows, variationPathKey, getMoveAssessment } from '@0disoft/banora';
import type { ControllerState, SgfNode } from '@0disoft/banora';
import { formatUiMessage } from '@0disoft/banora/locale';
import type { UiMessages } from '@0disoft/banora/locale';
import { setUiText } from '../ui-language.js';
import { coordinateTitle, setupNodeTitle } from './setup-editing.js';

/** Bounded outline presentation; authored controller state remains owned by Studio. */
export function createVariationTree(
  tree: HTMLElement,
  note: HTMLElement,
  onSelect: (id: string) => void,
) {
  let lastTreeState:
    | {
        record: ControllerState['record'];
        generation: number;
        ui: UiMessages;
        gameIndex: number;
        id: string;
        branches: string;
        presentation: string;
        outlineIds: ReadonlySet<string>;
        tailPresentation: string | undefined;
      }
    | undefined;
  const treeButtons = new Map<string, HTMLButtonElement>();
  let selectedTreeRow: HTMLDivElement | undefined;
  function nodeTitle(
    node: SgfNode,
    depth: number,
    width: number,
    height: number,
    ui: UiMessages,
  ): string {
    const value = node.properties.B?.[0] ?? node.properties.W?.[0];
    const color = node.properties.B ? ui.black : ui.white;
    if (value === undefined) {
      if (depth === 0) return ui.start;
      if (node.properties.N) return node.properties.N[0]!;
      return setupNodeTitle(node, height) ?? ui.annotation;
    }
    if (!value || (value === 'tt' && width <= 19 && height <= 19))
      return formatUiMessage(ui.colorPass, { color });
    return `${color} ${coordinateTitle(value, height)}`;
  }
  function revealTreeSelection(id: string): void {
    const button = treeButtons.get(id);
    if (!button) return;
    const bounds = tree.getBoundingClientRect(),
      selected = button.getBoundingClientRect();
    if (selected.top < bounds.top) tree.scrollTop += selected.top - bounds.top;
    else if (selected.bottom > bounds.bottom) tree.scrollTop += selected.bottom - bounds.bottom;
  }
  function render(state: ControllerState, ui: UiMessages): void {
    const previous = lastTreeState;
    const branches = variationPathKey(state);
    const reuse =
      previous?.record === state.record &&
      previous.generation === state.recordGeneration &&
      previous.ui === ui &&
      previous.gameIndex === state.gameIndex &&
      previous.branches === branches;
    if (reuse && previous.id === state.node.id) return;
    const outline = reuse ? undefined : getVariationRows(state, true);
    const describe = (
      node: SgfNode,
      depth: number,
      indent: number,
      moveNumber: number,
      branch = false,
      collapsed = false,
    ) => ({
      id: node.id,
      hasMenu: depth > 0,
      indent,
      expanded: branch && node.children.length ? !collapsed : undefined,
      color: node.properties.W ? 'white' : node.properties.B ? 'black' : 'root',
      title: `${moveNumber} · ${nodeTitle(node, depth, state.position.width, state.position.height, ui)}`,
      assessment: getMoveAssessment(node),
      hasComment: !!node.properties.C?.[0]?.trim(),
    });
    const rows = outline?.rows.map((entry) =>
      describe(
        entry.node,
        entry.depth,
        entry.indent,
        entry.moveNumber,
        entry.branch,
        entry.collapsed,
      ),
    );
    const outlineIds = outline
      ? new Set(outline.rows.map((entry) => entry.node.id))
      : previous!.outlineIds;
    const tail = !outlineIds.has(state.node.id)
      ? describe(state.node, state.path.length - 1, 0, state.position.moveNumber)
      : undefined;
    const tailPresentation = JSON.stringify(tail);
    // The same display model drives both cache invalidation and row rendering.
    const presentation = outline
      ? JSON.stringify([rows, outline.truncated])
      : previous!.presentation;
    lastTreeState = {
      record: state.record,
      generation: state.recordGeneration,
      ui,
      gameIndex: state.gameIndex,
      id: state.node.id,
      branches,
      presentation,
      outlineIds,
      tailPresentation,
    };
    if (
      previous?.generation === state.recordGeneration &&
      previous.ui === ui &&
      previous.gameIndex === state.gameIndex &&
      previous.id === state.node.id &&
      previous.presentation === presentation &&
      previous.tailPresentation === tailPresentation
    )
      return;
    const fragment = document.createDocumentFragment();
    const row = (model: ReturnType<typeof describe>) => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('role', 'listitem');
      const button = document.createElement('button');
      button.dataset.node = model.id;
      if (model.hasMenu) button.setAttribute('aria-haspopup', 'menu');
      button.setAttribute('aria-current', String(model.id === state.node.id));
      button.style.paddingLeft = `${10 + Math.min(model.indent, 8) * 13}px`;
      if (model.expanded !== undefined)
        button.setAttribute('aria-expanded', String(model.expanded));
      const disclosure = document.createElement('span');
      disclosure.className = 'variation-disclosure';
      disclosure.setAttribute('aria-hidden', 'true');
      button.append(disclosure);
      const dot = document.createElement('span');
      dot.className = `tree-dot ${model.color === 'black' ? '' : model.color}`;
      const text = document.createElement('span');
      text.textContent = model.title;
      button.append(dot, text);
      const assessment = model.assessment;
      const descriptions: string[] = [];
      if (assessment) {
        const indicator = document.createElement('span');
        indicator.className = `banora-move-assessment ${assessment}`;
        indicator.title = assessment === 'good' ? ui.goodMove : ui.badMove;
        indicator.setAttribute('aria-hidden', 'true');
        descriptions.push(indicator.title);
        button.append(indicator);
      }
      if (model.hasComment) {
        const indicator = document.createElement('span');
        indicator.className = 'banora-comment-indicator';
        indicator.title = ui.hasComment;
        indicator.setAttribute('aria-hidden', 'true');
        descriptions.push(ui.hasComment);
        button.append(indicator);
      }
      if (descriptions.length) button.setAttribute('aria-description', descriptions.join(' · '));
      button.addEventListener('click', () => onSelect(model.id));
      wrapper.append(button);
      fragment.append(wrapper);
      treeButtons.set(model.id, button);
      return wrapper;
    };
    if (reuse) {
      const restoreFocus = selectedTreeRow?.contains(document.activeElement) ?? false;
      treeButtons.get(previous.id)?.setAttribute('aria-current', 'false');
      if (selectedTreeRow) {
        selectedTreeRow.remove();
        treeButtons.delete(previous.id);
        selectedTreeRow = undefined;
      }
      const current = treeButtons.get(state.node.id);
      if (current) current.setAttribute('aria-current', 'true');
      else {
        selectedTreeRow = row(
          describe(state.node, state.path.length - 1, 0, state.position.moveNumber),
        );
        tree.append(fragment);
      }
      if (restoreFocus) treeButtons.get(state.node.id)?.focus({ preventScroll: true });
      revealTreeSelection(state.node.id);
      return;
    }
    treeButtons.clear();
    selectedTreeRow = undefined;
    for (const model of rows!) row(model);
    if (tail) selectedTreeRow = row(tail);
    tree.replaceChildren(fragment);
    revealTreeSelection(state.node.id);
    setUiText(
      note,
      outline!.truncated
        ? 'First 500 nodes shown. Move controls can navigate the whole record.'
        : '',
    );
  }
  return {
    render,
    buttons: treeButtons as ReadonlyMap<string, HTMLButtonElement>,
    reset() {
      lastTreeState = undefined;
      treeButtons.clear();
      selectedTreeRow = undefined;
    },
  };
}
