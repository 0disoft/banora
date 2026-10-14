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
    <button type="button" class="button icon" data-back aria-label="Back" title="Back" hidden></button>
    <h2 id="board-menu-title"></h2>
    <button type="button" class="button icon" data-close aria-label="Close menu" title="Close menu"></button>
    </div><div class="board-menu-home">
      <div class="board-menu-columns">
        <section class="board-menu-actions"><h3 data-ui-text="Actions"></h3><div class="board-menu-choices"></div></section>
        <section class="board-menu-settings"><h3 data-ui-text="View & controls"></h3><div class="board-menu-quick"></div></section>
      </div>
      <div class="board-menu-footer"></div>
    </div><div class="board-menu-content"></div>`;
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
  const home = panel.querySelector<HTMLElement>('.board-menu-home')!;
  const quick = panel.querySelector<HTMLElement>('.board-menu-quick')!;
  const footer = panel.querySelector<HTMLElement>('.board-menu-footer')!;
  const content = panel.querySelector<HTMLElement>('.board-menu-content')!;
  interface MenuGroup {
    id: string;
    label: string;
    controls?: HTMLElement[];
    sections?: { label: string; controls: HTMLElement[] }[];
    launch?: { button: string; dialog: string };
    reveal?: { button: string; panel: string };
  }
  const groups: MenuGroup[] = [
    {
      id: 'tools',
      label: 'Record & edit',
      sections: [
        { label: 'Game', controls: [find('record-actions'), find('record-details')] },
        { label: 'Tool', controls: [row('tool'), find('ink-control')] },
        { label: 'Next player', controls: [row('next-player')] },
      ],
    },
    { id: 'textures', label: 'Stone textures', controls: [find('texture-host')] },
    {
      id: 'comparison',
      label: 'Compare positions',
      controls: [row('compare'), find('comparison-panel')],
      reveal: { button: 'compare', panel: 'comparison-panel' },
    },
    { id: 'share', label: 'Share', controls: [find('sharing-host')] },
    {
      id: 'drafts',
      label: 'Local drafts',
      controls: [],
      launch: { button: 'drafts-open', dialog: 'drafts-dialog' },
    },
    {
      id: 'search',
      label: 'Search record',
      controls: [],
      launch: { button: 'search-open', dialog: 'search-dialog' },
    },
    {
      id: 'support',
      label: 'Help',
      controls: [],
      launch: { button: 'support-open', dialog: 'support-dialog' },
    },
    {
      id: 'preferences',
      label: 'All settings',
      sections: [
        { label: 'View', controls: [find('board-settings'), row('rotation')] },
        { label: 'Stone textures', controls: [find('texture-host')] },
        { label: 'Animation', controls: [row('animation')] },
        { label: 'Touch placement', controls: [row('touch-mode')] },
        { label: 'Settings', controls: [find('preferences-host')] },
      ],
    },
    {
      id: 'scoring',
      label: 'Score position',
      controls: [find('scoring-host')],
      reveal: { button: 'score-open', panel: 'score-panel' },
    },
  ];
  const quickControls = [
    find('theme').closest<HTMLElement>('label')!,
    row('animation'),
    row('touch-mode'),
  ];
  const textureRow = document.createElement('div');
  textureRow.className = 'board-menu-textures';
  textureRow.innerHTML = `<span id="board-menu-texture-label" data-ui-text="Stone textures"></span><span class="board-menu-stone-previews" aria-hidden="true"></span>`;
  setUiText(textureRow.firstElementChild as HTMLElement, 'Stone textures');
  for (const color of ['black', 'white']) {
    const preview = document.createElement('img');
    preview.src =
      color === 'black'
        ? new URL('./assets/black-stone.webp', import.meta.url).href
        : new URL('./assets/white-stone.webp', import.meta.url).href;
    preview.alt = '';
    textureRow.querySelector('.board-menu-stone-previews')!.append(preview);
  }
  const buttons = new Map<string, HTMLButtonElement>();
  let active: (typeof groups)[number] | undefined;
  let borrowed: { control: HTMLElement; placeholder: Comment }[] = [];
  const abort = new AbortController();
  const { signal } = abort;
  const modalOpeners = new Map<HTMLElement, HTMLButtonElement>();
  // Help owns its links permanently rather than leaving them in a redundant launcher screen.
  const links = find('example-links');
  const linksPlaceholder = document.createComment('help links');
  links.before(linksPlaceholder);
  find('support-dialog').querySelector('.dialog-actions')!.before(links);
  for (const group of groups) {
    if (!group.launch) continue;
    const dialog = find(group.launch.dialog);
    dialog.addEventListener(
      'close',
      () => {
        const opener = modalOpeners.get(dialog);
        modalOpeners.delete(dialog);
        const focused = document.activeElement;
        if (
          opener &&
          !document.querySelector('dialog:modal') &&
          !panel.matches(':popover-open') &&
          (focused === document.body ||
            triggers.includes(focused as HTMLButtonElement) ||
            (focused instanceof HTMLElement && !focused.checkVisibility()))
        )
          opener.focus({ preventScroll: true });
      },
      { signal },
    );
  }
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
    content.replaceChildren();
  }
  function borrow(controls: HTMLElement[], destination: HTMLElement) {
    for (const control of controls) {
      const placeholder = document.createComment('board-menu control');
      control.before(placeholder);
      borrowed.push({ control, placeholder });
      destination.append(control);
    }
  }
  function position() {
    const viewport = window.visualViewport;
    const width = viewport?.width ?? innerWidth;
    const height = viewport?.height ?? innerHeight;
    const offsetLeft = viewport?.offsetLeft ?? 0;
    const offsetTop = viewport?.offsetTop ?? 0;
    const gutter = 12;
    panel.style.maxWidth = `${Math.max(0, width - 2 * gutter)}px`;
    panel.style.maxHeight = `${Math.max(0, height - 2 * gutter)}px`;
    // Refresh bounds before opening as well: the last open may have used a narrow viewport.
    if (!panel.matches(':popover-open')) return;
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
    home.hidden = !!group;
    content.hidden = !group;
    back.hidden = !group;
    panel.dataset.section = group?.id ?? '';
    setUiText(title, group?.label ?? 'Board menu');
    if (group?.sections) {
      for (const section of group.sections) {
        const collapsible = section.label === 'Stone textures';
        const container = document.createElement(collapsible ? 'details' : 'section');
        container.className = 'board-menu-section';
        const heading = document.createElement('h3');
        setUiText(heading, section.label);
        if (collapsible) {
          const summary = document.createElement('summary');
          summary.append(heading);
          container.append(summary);
        } else container.append(heading);
        content.append(container);
        borrow(section.controls, container);
      }
    } else if (group) borrow(group.controls ?? [], content);
    else {
      borrow(quickControls, quick);
      quickControls[0]!.after(textureRow);
    }
    panel.scrollTop = 0;
    position();
  }
  for (const group of groups) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button board-menu-action';
    button.dataset.boardMenuSection = group.id;
    const label = document.createElement('span');
    setUiText(label, group.id === 'textures' ? 'Change' : group.label);
    if (group.id === 'textures') {
      label.id = 'board-menu-change-label';
      button.setAttribute('aria-labelledby', 'board-menu-texture-label board-menu-change-label');
    }
    button.append(label);
    buttons.set(group.id, button);
    button.addEventListener(
      'click',
      () => {
        if (group.launch) {
          modalOpeners.set(find(group.launch.dialog), trigger);
          panel.hidePopover();
          trigger.focus({ preventScroll: true });
          find(group.launch.button).click();
          return;
        }
        select(group);
        if (group.reveal && find(group.reveal.panel).hidden) find(group.reveal.button).click();
        content
          .querySelector<HTMLElement>(
            'select,input,textarea,button:not(:disabled):not(#compare):not(#score-open)',
          )
          ?.focus({ preventScroll: true });
      },
      { signal },
    );
  }
  for (const id of ['tools', 'search', 'comparison', 'scoring', 'share', 'drafts'])
    choices.append(buttons.get(id)!);
  textureRow.append(buttons.get('textures')!);
  footer.append(buttons.get('support')!, buttons.get('preferences')!);
  for (const element of panel.querySelectorAll<HTMLElement>('[data-ui-text]'))
    setUiText(element, element.dataset.uiText!);
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
      buttons.get(previous!)?.focus({ preventScroll: true });
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
  content.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        (active?.id === 'scoring' &&
          target.closest('#score-close') &&
          find('score-panel').hidden) ||
        (active?.id === 'comparison' &&
          target.closest('#compare') &&
          find('comparison-panel').hidden)
      ) {
        panel.hidePopover();
        trigger.focus({ preventScroll: true });
      }
    },
    { signal },
  );
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
    modalOpeners.clear();
    linksPlaceholder.replaceWith(links);
    panel.remove();
    for (const entry of triggers) entry.removeAttribute('popovertarget');
  };
}
