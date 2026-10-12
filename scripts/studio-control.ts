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
  await page.locator('#app-menu').click();
  await page.locator(`[data-board-menu-section="${section}"]`).click();
  try {
    return await action();
  } finally {
    if ((await panel.count()) && !(await page.locator('dialog:modal').count()))
      await page.locator('#board-menu-panel [data-close]').click();
  }
}
