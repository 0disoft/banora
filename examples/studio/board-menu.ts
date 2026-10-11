import { localizeUi, setUiText, subscribeUiLanguage, translateUi } from '../ui-language.js';

/** Borrow existing controls so both entry points share values, handlers and history. */
export function mountBoardMenu(): () => void {
  const find = (id: string) => document.getElementById(id)!;
  const row = (id: string) => find(id).closest<HTMLElement>('.editing-tools')!;
  const trigger = find('board-menu') as HTMLButtonElement;
  const panel = document.createElement('div');
  panel.id = 'board-menu-panel';
  panel.className = 'board-menu-panel';
  panel.popover = 'auto';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'board-menu-title');
  panel.innerHTML = `<div class="board-menu-heading">
    <button type="button" class="button icon" data-back aria-label="Back" title="Back" hidden>←</button>
    <h2 id="board-menu-title"></h2>
    <button type="button" class="button icon" data-close aria-label="Close menu" title="Close menu">×</button>
    </div><div class="board-menu-choices"></div><div class="board-menu-content"></div>`;
  document.body.append(panel);
  trigger.setAttribute('popovertarget', panel.id);
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  const title = panel.querySelector<HTMLElement>('h2')!;
  const back = panel.querySelector<HTMLButtonElement>('[data-back]')!;
  const close = panel.querySelector<HTMLButtonElement>('[data-close]')!;
  const choices = panel.querySelector<HTMLElement>('.board-menu-choices')!;
  const content = panel.querySelector<HTMLElement>('.board-menu-content')!;
  const groups = [
    {
      id: 'tools',
      label: 'Tool',
      controls: [row('tool'), find('ink-control'), row('next-player')],
    },
    { id: 'view', label: 'View', controls: [row('rotation')] },
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
  function restore() {
    for (const { control, placeholder } of borrowed) placeholder.replaceWith(control);
    borrowed = [];
  }
  function position() {
    if (!panel.matches(':popover-open')) return;
    const anchor = trigger.getBoundingClientRect();
    const gutter = 12;
    const left = Math.max(
      gutter,
      Math.min(anchor.right - panel.offsetWidth, innerWidth - panel.offsetWidth - gutter),
    );
    const top = Math.max(
      gutter,
      Math.min(anchor.bottom + 8, innerHeight - panel.offsetHeight - gutter),
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
    trigger.setAttribute('aria-label', translateUi('Board menu'));
    trigger.title = translateUi('Board menu');
    setUiText(title, active?.label ?? 'Board menu');
    position();
  });
  select();
  trigger.setAttribute('aria-label', translateUi('Board menu'));
  trigger.title = translateUi('Board menu');
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
      trigger.setAttribute('aria-expanded', String(opened));
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
  window.addEventListener('resize', position, { signal });
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
    trigger.removeAttribute('popovertarget');
  };
}
