// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin,
    errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  const verify = (value, message) => {
    if (!value) throw Error(message);
  };
  const effects = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('svg')].map((svg) => ({
        host: svg.parentElement.closest('[id]')?.id,
        effects: svg.getAnimations({ subtree: true }).map((effect) => ({
          duration: effect.effect.getTiming().duration,
          time: Number(effect.currentTime),
        })),
      })),
    );
  for (const name of ['studio', 'react', 'vue', 'svelte']) {
    const studio = name === 'studio';
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${origin}/${name}/`);
    const board = page.locator(studio ? '#board svg' : '#board-host svg');
    await board.waitFor();
    verify(
      !(await page.locator('#animation').isChecked()) &&
        (await page.locator('#animation-duration').isDisabled()),
      `${name}: motion was not opt-in`,
    );
    await page.locator(studio ? '#next' : '#advance').click();
    verify(
      (await effects()).every((view) => view.effects.length === 0),
      `${name}: disabled motion animated`,
    );
    await page.locator('#animation').check();
    await page.locator('#animation-duration').selectOption('1000');
    const state = page.locator(studio ? '#move' : '#state'),
      before = await state.innerText();
    await page.locator(studio ? '#next' : '#advance').click();
    let running = await effects();
    verify(
      running.filter((view) => view.effects.length === 1).length === (studio ? 1 : 2),
      `${name}: Board/Viewer motion props failed: ${JSON.stringify(running)}`,
    );
    verify(
      running.flatMap((view) => view.effects).every((effect) => effect.duration === 1000),
      `${name}: duration prop failed`,
    );
    await page.evaluate(() => {
      for (const svg of document.querySelectorAll('svg'))
        for (const effect of svg.getAnimations({ subtree: true })) {
          effect.pause();
          effect.currentTime = 100;
        }
    });
    const current = await state.innerText();
    verify(current !== before, `${name}: animation delayed the record command`);
    const notes = studio
      ? page.locator('#comment')
      : page.locator('#viewer-host').getByRole('textbox', { name: 'Position comments' });
    await notes.fill('Motion is presentation; preserve these notes.');
    await notes.blur();
    running = await effects();
    verify(
      running.filter((view) => view.effects.length === 1).length === (studio ? 1 : 2),
      `${name}: native redraw lost/restarted motion`,
    );
    await page.evaluate(() => {
      for (const svg of document.querySelectorAll('svg'))
        for (const effect of svg.getAnimations({ subtree: true })) {
          effect.pause();
          effect.currentTime = 0;
        }
    });
    for (const format of ['svg', 'png']) {
      const saved = page.waitForEvent('download');
      await page.locator(studio ? `#${format}-export` : `#${format}`).click();
      const download = await saved;
      await download.saveAs(`output/playwright/${name}-animation.${format}`);
    }
    verify(
      (await state.innerText()).includes(studio ? 'Move 2' : 'changed'),
      `${name}: diagram changed record state`,
    );
    await page.locator('#animation').uncheck();
    verify(
      (await effects()).every((view) => !view.effects.length),
      `${name}: disabling did not cancel effects`,
    );
    await page.locator('#animation').check();
    await page.locator('#animation-duration').selectOption('320');
    await page.locator(studio ? '#next' : '#advance').click();
    running = await effects();
    verify(
      running.flatMap((view) => view.effects).every((effect) => effect.duration === 320) &&
        running.some((view) => view.effects.length),
      `${name}: changed duration did not reach renderer`,
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() =>
      [...document.querySelectorAll('svg')].every(
        (svg) => !svg.getAnimations({ subtree: true }).length,
      ),
    );
    await page.locator(studio ? '#next' : '#advance').click();
    verify(
      (await effects()).every((view) => !view.effects.length),
      `${name}: native reduced-motion ignored`,
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#animation-duration').selectOption('1000');
    await page.locator('#compare').click();
    await page.locator(studio ? '#next' : '#advance').click();
    running = await effects();
    verify(
      running.filter((view) => view.effects.length).length === (studio ? 1 : 2),
      `${name}: pinned comparison animated or main lost motion`,
    );
    const retained = await state.innerText();
    if (studio) {
      // Studio now restores the prior session's rotation; exercise an actual change.
      const rotation = page.locator('#rotation');
      await rotation.selectOption((await rotation.inputValue()) === '90' ? '180' : '90');
      verify(
        (await effects()).every((view) => !view.effects.length),
        'Studio transform retained old effects',
      );
      const saved = page.waitForEvent('download');
      await page.locator('#export').click();
      await saved;
    } else {
      await page.locator('#swap').click();
      verify(
        (await effects()).every((view) => !view.effects.length),
        `${name}: controller swap leaked old effects`,
      );
      await page.locator('#swap').click();
      verify(
        (await state.innerText()) === retained &&
          (await effects()).every((view) => !view.effects.length),
        `${name}: owner restoration replayed motion or lost record`,
      );
      const owned = page.locator('#owned-board svg');
      await owned.focus();
      await page.keyboard.press('Enter');
      verify(
        (await owned.locator('[data-placement-animation]').count()) === 1 &&
          (await state.innerText()) === retained,
        `${name}: owned controller motion/state diverged`,
      );
      await page.locator('#toggle').click();
      verify((await page.locator('svg').count()) === 0, `${name}: unmount leaked drawing`);
      await page.locator('#toggle').click();
      await board.waitFor();
      verify(
        (await effects()).every((view) => !view.effects.length) &&
          (await state.innerText()) === retained,
        `${name}: remount animated old stones or lost state`,
      );
      // Repeated adjacent playback must replace effects rather than accumulate them.
      await page
        .locator('#viewer-host')
        .getByRole('button', { name: 'First node', exact: true })
        .click();
      for (let i = 0; i < 5; i++) {
        await page.locator('#advance').click();
        verify(
          (await effects()).every((view) => view.effects.length <= 1),
          `${name}: rapid playback accumulated effects`,
        );
      }
      await page.locator('#animation').uncheck();
    }
    await page.screenshot({
      path: `output/playwright/${name}-animation-controls.png`,
      fullPage: true,
    });
  }
  verify(errors.length === 0, 'Animation consumer errors: ' + errors.join('; '));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return 'banora-animation-consumers-complete: studio react vue svelte';
};
