async page => {
  const origin = new URL(page.url()).origin;
  const failures = [];
  page.on('pageerror', error => failures.push(String(error)));
  await page.goto(`${origin}/browser/`);
  await page.getByRole('application').waitFor();
  if (await page.locator('script[type="module"]').count()) throw Error('Classic example unexpectedly requires modules');
  await page.locator('#advance').click();
  await page.waitForFunction(() => document.querySelector('#state').textContent.includes('Move 1'));
  if (await page.locator('[data-stone]').count() !== 1) throw Error('Classic public viewer navigation failed');
  await page.locator('#toggle').click();
  if (await page.locator('svg').count()) throw Error('Classic disposal leaked board');
  await page.locator('#advance').click();
  await page.locator('#toggle').click();
  if (await page.locator('[data-stone]').count() !== 2) throw Error('Classic remount lost external controller');
  await page.locator('#editable').click();
  await page.getByRole('textbox', {name:'Position comments'}).fill('Classic script edit');
  await page.waitForFunction(() => document.querySelector('#state').textContent.includes('changed'));
  await page.getByRole('button', {name:'Undo', exact:true}).click();
  await page.waitForFunction(() => document.querySelector('#state').textContent.includes('clean'));
  await page.screenshot({path:'output/playwright/classic-script.png', fullPage:true});
  if (failures.length) throw Error(failures.join('; '));
  return 'banora-global-complete';
}
