import { localizeUi, setUiText, subscribeUiLanguage, translateUi } from '../ui-language.js';

/** Borrow existing controls so both entry points share values, handlers and history. */
export function mountBoardMenu(): () => void {
  const find = (id: string) => document.getElementById(id)!;
  const row = (id: string) => find(id).closest<HTMLElement>('.editing-tools')!;
  const triggers = [find('board-menu'), find('app-menu')] as HTMLButtonElement[];
  let trigger = triggers[0]!;
  const panel = document.createElement('div');
  panel.id = 'board-menu-panel';
  panel.className = 'board-menu-panel';
  panel.popover = 'auto';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'board-menu-title');
  panel.innerHTML = `<div class="board-menu-heading">
    <button type="button" class="button icon" data-back aria-label="Back" title="Back" hidden><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10H4m5-5-5 5 5 5"/></svg></button>
    <h2 id="board-menu-title"></h2>
    <button type="button" class="button icon" data-close aria-label="Close menu" title="Close menu"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button>
    </div><div class="board-menu-choices"></div><div class="board-menu-content"></div>`;
  document.body.append(panel);
  for (const entry of triggers) {
    entry.setAttribute('popovertarget', panel.id);
    entry.setAttribute('aria-haspopup', 'dialog');
    entry.setAttribute('aria-expanded', 'false');
  }
  const title = panel.querySelector<HTMLElement>('h2')!;
  const back = panel.querySelector<HTMLButtonElement>('[data-back]')!;
  const close = panel.querySelector<HTMLButtonElement>('[data-close]')!;
  const choices = panel.querySelector<HTMLElement>('.board-menu-choices')!;
  const content = panel.querySelector<HTMLElement>('.board-menu-content')!;
  const groups = [
    { id: 'record', label: 'Game', controls: [find('record-actions'), find('record-details')] },
    {
      id: 'tools',
      label: 'Tool',
      controls: [row('tool'), find('ink-control'), row('next-player')],
    },
    { id: 'view', label: 'View', controls: [find('board-settings'), row('rotation')] },
    { id: 'textures', label: 'Stone textures', controls: [find('texture-host')] },
    { id: 'touch', label: 'Touch placement', controls: [row('touch-mode')] },
    { id: 'animation', label: 'Animation', controls: [row('animation')] },
    {
      id: 'comparison',
      label: 'Compare positions',
      controls: [row('compare'), find('comparison-panel')],
      open: () => {
        if (find('comparison-panel').hidden) find('compare').click();
      },
    },
    { id: 'share', label: 'Share', controls: [find('sharing-host')] },
    { id: 'drafts', label: 'Local drafts', controls: [find('drafts-host')] },
    { id: 'search', label: 'Search record', controls: [find('search-host')] },
    { id: 'support', label: 'Help', controls: [find('support-host'), find('example-links')] },
    { id: 'preferences', label: 'Settings', controls: [find('preferences-host')] },
    {
      id: 'scoring',
      label: 'Score position',
      controls: [find('scoring-host')],
      open: () => {
        if (find('score-panel').hidden) find('score-open').click();
      },
    },
  ];
  let active: (typeof groups)[number] | undefined;
  let borrowed: { control: HTMLElement; placeholder: Comment }[] = [];
  const abort = new AbortController();
  const { signal } = abort;
  for (const entry of triggers) {
    entry.addEventListener(
      'click',
      () => {
        trigger = entry;
      },
      { signal },
    );
  }
  function restore() {
    for (const { control, placeholder } of borrowed) placeholder.replaceWith(control);
    borrowed = [];
  }
  function position() {
    if (!panel.matches(':popover-open')) return;
    const viewport = window.visualViewport;
    const width = viewport?.width ?? innerWidth;
    const height = viewport?.height ?? innerHeight;
    const offsetLeft = viewport?.offsetLeft ?? 0;
    const offsetTop = viewport?.offsetTop ?? 0;
    const gutter = 12;
    panel.style.maxWidth = `${Math.max(0, width - 2 * gutter)}px`;
    panel.style.maxHeight = `${Math.max(0, height - 2 * gutter)}px`;
    const anchor = trigger.getBoundingClientRect();
    const left = Math.max(
      offsetLeft + gutter,
      Math.min(anchor.right - panel.offsetWidth, offsetLeft + width - panel.offsetWidth - gutter),
    );
    const top = Math.max(
      offsetTop + gutter,
      Math.min(anchor.bottom + 8, offsetTop + height - panel.offsetHeight - gutter),
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }
  function select(group?: (typeof groups)[number]) {
    restore();
    active = group;
    choices.hidden = !!group;
    back.hidden = !group;
    panel.dataset.section = group?.id ?? '';
    setUiText(title, group?.label ?? 'Board menu');
    if (group) {
      for (const control of group.controls) {
        const placeholder = document.createComment('board-menu control');
        control.before(placeholder);
        borrowed.push({ control, placeholder });
        content.append(control);
      }
      group.open?.();
    }
    panel.scrollTop = 0;
    position();
  }
  for (const group of groups) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.dataset.boardMenuSection = group.id;
    setUiText(button, group.label);
    button.addEventListener(
      'click',
      () => {
        select(group);
        content
          .querySelector<HTMLElement>('select,input,button:not(:disabled),textarea')
          ?.focus({ preventScroll: true });
      },
      { signal },
    );
    choices.append(button);
  }
  const disposeStatic = localizeUi(panel);
  const disposeLanguage = subscribeUiLanguage(() => {
    for (const entry of triggers) {
      entry.setAttribute('aria-label', translateUi('Board menu'));
      entry.title = translateUi('Board menu');
    }
    setUiText(title, active?.label ?? 'Board menu');
    position();
  });
  select();
  for (const entry of triggers) {
    entry.setAttribute('aria-label', translateUi('Board menu'));
    entry.title = translateUi('Board menu');
  }
  back.addEventListener(
    'click',
    () => {
      const previous = active?.id;
      select();
      choices
        .querySelector<HTMLElement>(`[data-board-menu-section="${previous}"]`)
        ?.focus({ preventScroll: true });
    },
    { signal },
  );
  close.addEventListener(
    'click',
    () => {
      panel.hidePopover();
      trigger.focus({ preventScroll: true });
    },
    { signal },
  );
  panel.addEventListener(
    'beforetoggle',
    (event) => {
      const opened = (event as ToggleEvent).newState === 'open';
      for (const entry of triggers)
        entry.setAttribute('aria-expanded', String(opened && entry === trigger));
      if (opened) select();
      else {
        const returnFocus = panel.contains(document.activeElement);
        restore();
        if (returnFocus) trigger.focus({ preventScroll: true });
      }
    },
    { signal },
  );
  panel.addEventListener('toggle', position, { signal });
  panel.addEventListener('change', position, { signal });
  // A completed Undo can disable its focused button and leave focus on body.
  // Escape still belongs to this open menu; unrelated dialogs retain their focus.
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !panel.matches(':popover-open'))
        return;
      if (!panel.contains(document.activeElement) && document.activeElement !== document.body)
        return;
      event.preventDefault();
      panel.hidePopover();
      trigger.focus({ preventScroll: true });
    },
    { signal },
  );
  window.addEventListener('resize', position, { signal });
  window.visualViewport?.addEventListener('resize', position, { signal });
  window.visualViewport?.addEventListener('scroll', position, { signal });
  document.addEventListener('scroll', position, { capture: true, signal });
  const observer = new ResizeObserver(position);
  observer.observe(panel);
  return () => {
    if (panel.matches(':popover-open')) panel.hidePopover();
    restore();
    observer.disconnect();
    abort.abort();
    disposeStatic();
    disposeLanguage();
    panel.remove();
    for (const entry of triggers) entry.removeAttribute('popovertarget');
  };
}
