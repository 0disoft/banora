/** Reuse the consumer's controls and listeners; each action keeps one DOM owner. */
export function arrangeStudio(): void {
  const find = (id: string) => document.getElementById(id)!;
  const main = document.querySelector('main')!;
  const workspace = document.querySelector('.workspace')!;
  const sidebar = document.querySelector('.sidebar')!;
  const boardPanel = document.querySelector('.board-panel')!;
  const metadata = document.querySelector('.metadata')!;
  const reservoir = document.createElement('section');
  reservoir.className = 'control-reservoir';
  reservoir.hidden = true;
  main.append(reservoir);

  const fileToolbar = document.querySelector('.file-toolbar')!;
  const fileActions = document.querySelector('.file-actions')!;
  fileActions.id = 'record-actions';
  document.querySelector('.header-actions')!.prepend(find('open'));
  reservoir.append(fileToolbar);
  document.querySelector('.comments')!.append(find('dirty'));
  metadata.prepend(find('game-name'));
  const details = document.createElement('div');
  details.id = 'record-details';
  const detailsList = document.createElement('dl');
  detailsList.append(find('board-info').parentElement!);
  details.append(
    metadata.querySelector(':scope > label')!,
    detailsList,
    document.querySelector('.position-info')!,
  );
  reservoir.append(details);
  workspace.prepend(sidebar);

  const settings = document.querySelector('.board-top')!;
  settings.classList.add('editing-tools');
  settings.id = 'board-settings';
  const toolbar = document.createElement('div');
  toolbar.className = 'board-toolbar';
  const tools = find('tool').closest('.editing-tools')!;
  tools.classList.add('primary-tools');
  tools.append(find('flip-x').closest('label')!);
  toolbar.append(tools, find('board-menu'));
  const appMenu = document.createElement('button');
  appMenu.id = 'app-menu';
  appMenu.type = 'button';
  appMenu.className = 'button icon';
  appMenu.setAttribute('aria-label', 'Board menu');
  appMenu.title = 'Board menu';
  document.querySelector('.header-actions')!.append(appMenu);
  reservoir.append(settings);

  for (const row of [...boardPanel.querySelectorAll(':scope > .editing-tools')])
    reservoir.append(row);
  reservoir.append(find('texture-host'));
  find('next').before(find('playback'));
  find('next-player').closest('.editing-tools')!.append(find('pass'));
  boardPanel.prepend(toolbar);

  for (const element of [...main.children]) {
    if (element === workspace || element === reservoir || element.tagName === 'FOOTER') continue;
    reservoir.append(element);
  }
  const links = document.createElement('nav');
  links.id = 'example-links';
  links.className = 'example-links';
  links.append(...document.querySelectorAll('footer a'));
  reservoir.append(links);
}
