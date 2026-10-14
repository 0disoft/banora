interface ControlLocator {
  count(): Promise<number>;
  isVisible(): Promise<boolean>;
  click(): Promise<void>;
}
interface ControlPage {
  locator(selector: string): ControlLocator;
}

/** Drive the actual menu when a consumer action moved out of the primary view. */
export async function studioControl(
  page: ControlPage,
  selector: string,
  section: string,
  action: () => Promise<unknown>,
): Promise<unknown> {
  if (!(await page.locator('#app-menu').count()) || (await page.locator(selector).isVisible()))
    return action();
  const panel = page.locator('#board-menu-panel:popover-open');
  if (await panel.count()) await page.locator('#board-menu-panel [data-close]').click();
  const comparisonWasOpen = await page.locator('#comparison-panel:not([hidden])').count();
  await page.locator('#app-menu').click();
  if (!(await page.locator(selector).isVisible())) {
    const destination =
      section === 'record' ? 'tools' : section === 'view' ? 'preferences' : section;
    await page.locator(`[data-board-menu-section="${destination}"]`).click();
  }
  try {
    // Menu selection itself now launches these tools, using their real existing handlers.
    const dialogs: Record<string, string> = {
      '#search-open': '#search-dialog:modal',
      '#drafts-open': '#drafts-dialog:modal',
      '#support-open': '#support-dialog:modal',
    };
    const dialog = dialogs[selector];
    if (dialog && (await page.locator(dialog).count())) return;
    if (selector === '#score-open' && (await page.locator('#score-panel:not([hidden])').count()))
      return;
    if (selector === '#compare' && !comparisonWasOpen) return;
    return await action();
  } finally {
    if ((await panel.count()) && !(await page.locator('dialog:modal').count()))
      await page.locator('#board-menu-panel [data-close]').click();
  }
}
