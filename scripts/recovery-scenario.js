// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (rootPage, studioControl) => {
  const address = new URL(rootPage.url()).origin;
  let page = await rootPage.context().newPage();
  await page.goto(`${address}/studio/`);
  const expect = (locator, negate = false) => {
    const verify = async (predicate, expected = '') => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await predicate()) !== negate) return;
        await page.waitForTimeout(30);
      }
      await page.screenshot({ path: 'output/playwright/recovery-failed.png' });
      throw Error(
        `Recovery assertion failed: ${locator}; expected=${expected}; actual=${await locator.textContent()}`,
      );
    };
    return {
      get not() {
        return expect(locator, !negate);
      },
      toBeVisible: () => verify(() => locator.isVisible()),
      toBeDisabled: () => verify(() => locator.isDisabled()),
      toBeChecked: () => verify(() => locator.isChecked()),
      toHaveCount: (count) => verify(async () => (await locator.count()) === count),
      toHaveText: (text) => verify(async () => (await locator.textContent()) === text, text),
      toContainText: (text) =>
        verify(async () => (await locator.textContent()).includes(text), text),
      toHaveValue: (value) => verify(async () => (await locator.inputValue()) === value),
      toHaveAttribute: (name, value) =>
        verify(async () => (await locator.getAttribute(name)) === value),
    };
  };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const records = (target) =>
    target.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open('banora.studio.drafts', 1);
          request.onerror = () => reject(Error('Cannot inspect draft database'));
          request.onsuccess = () => {
            const db = request.result,
              transaction = db.transaction(['entries', 'drafts'], 'readonly');
            const entries = transaction.objectStore('entries').getAll(),
              drafts = transaction.objectStore('drafts').getAll();
            transaction.oncomplete = () => {
              db.close();
              resolve({ entries: entries.result, drafts: drafts.result });
            };
            transaction.onabort = () => {
              db.close();
              reject(Error('Draft inspection aborted'));
            };
          };
        }),
    );
  const openDrafts = async (target) => {
    await studioControl(target, '#drafts-open', 'drafts', () =>
      target.locator('#drafts-open').click(),
    );
    await expect(target.locator('#drafts-dialog')).toBeVisible();
  };
  const choose = async (target, id) => {
    await target.locator('#draft-refresh').click();
    await expect(target.locator(`#draft-list option[value="${id}"]`)).toHaveCount(1);
    await target.locator('#draft-list').selectOption(id);
  };
  await page.locator('#language').selectOption('en');
  await page.locator('#file').setInputFiles({
    name: 'recovery.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from(
      '(;SZ[5]GN[Recovery record]XX[keep];B[aa](;W[bb]C[first])(;W[cc]C[original]))',
    ),
  });
  await page.locator('#tree button').filter({ hasText: 'White C3' }).click();
  await page.locator('#comment').fill('unfinished 한국어 <tag>');
  await page.locator('#comment').blur();
  await expect(page.locator('#draft-status')).toHaveText('Draft saved');
  const initial = await records(page);
  const original = initial.drafts.find(
    (item) => item.filename === 'recovery.sgf' && item.checkpoint.sgf.includes('unfinished 한국어'),
  );
  if (
    !original ||
    !original.checkpoint.baselineSgf.includes('C[original]') ||
    original.checkpoint.selection.path.join(',') !== '0,1'
  )
    throw Error('Autosave lost branch or export baseline');
  await openDrafts(page);
  const backupEvent = page.waitForEvent('download');
  await page.locator('#backup-save').click();
  const backup = await backupEvent;
  await backup.saveAs('output/playwright/recovery.banora.json');
  await expect(page.locator('#dirty')).toHaveText('Unsaved changes');
  await page.locator('#draft-close').click();
  const context = page.context();
  await page.close();
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${address}/studio/`);
  await page.locator('#language').selectOption('en');
  await openDrafts(page);
  await choose(page, original.id);
  await page.locator('#draft-restore').click();
  await expect(page.locator('#drafts-dialog')).not.toBeVisible();
  await expect(page.locator('#comment')).toHaveValue('unfinished 한국어 <tag>');
  await expect(page.locator('#dirty')).toHaveText('Unsaved changes');
  await expect(page.locator('#undo')).toBeDisabled();
  await expect(page.locator('#board [data-stone]')).toHaveCount(2);
  await page.locator('#comment').fill('new session');
  await page.locator('#comment').blur();
  await page.locator('#undo').click();
  await expect(page.locator('#comment')).toHaveValue('unfinished 한국어 <tag>');
  await expect(page.locator('#dirty')).toHaveText('Unsaved changes');

  const second = await page.context().newPage();
  second.on('pageerror', (error) => errors.push(error.message));
  second.on('dialog', (dialog) => dialog.accept());
  await second.goto(`${address}/studio/`);
  await second.locator('#language').selectOption('en');
  await openDrafts(second);
  await choose(second, original.id);
  await second.locator('#draft-restore').click();
  await expect(second.locator('#comment')).toHaveValue('unfinished 한국어 <tag>');
  await page.locator('#comment').fill('first-tab edit');
  await page.locator('#comment').blur();
  await second.locator('#comment').fill('second-tab edit');
  await second.locator('#comment').blur();
  await expect(page.locator('#draft-status')).toHaveText('Draft saved');
  await expect(second.locator('#draft-status')).toHaveText('Draft saved');
  const concurrent = await records(page);
  for (const text of ['unfinished 한국어', 'first-tab edit', 'second-tab edit'])
    if (!concurrent.drafts.some((item) => item.checkpoint.sgf.includes(text)))
      throw Error('Concurrent tabs overwrote a saved draft');
  await second.close();

  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    window.restoreDraftPut = () => {
      IDBObjectStore.prototype.put = native;
    };
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'drafts')
        throw new DOMException('Fixture quota denial', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
  });
  await page.locator('#comment').fill('quota-kept');
  await page.locator('#comment').blur();
  await expect(page.locator('#draft-status')).toContainText('Storage full.');
  const quota = await records(page);
  if (quota.drafts.some((item) => item.checkpoint.sgf.includes('quota-kept')))
    throw Error('Failed payload write committed partial data');
  if (JSON.stringify(quota.entries) !== JSON.stringify(concurrent.entries))
    throw Error('Failed save did not roll back metadata');
  await expect(page.locator('#comment')).toHaveValue('quota-kept');
  await openDrafts(page);
  await page.evaluate(() => window.restoreDraftPut());
  await page.locator('#draft-retry').click();
  await expect(page.locator('#draft-status')).toHaveText('Draft saved');
  await page.locator('#draft-close').click();
  await page.locator('#undo').click();
  await expect(page.locator('#comment')).toHaveValue('first-tab edit');

  // Fill the real database to its cap without deleting existing sessions.
  await page.evaluate(async () => {
    const request = indexedDB.open('banora.studio.drafts', 1);
    await new Promise((resolve, reject) => {
      request.onsuccess = resolve;
      request.onerror = reject;
    });
    const db = request.result,
      transaction = db.transaction(['entries', 'drafts'], 'readwrite');
    const entries = transaction.objectStore('entries'),
      count = entries.count();
    count.onsuccess = () => {
      for (let i = count.result; i < 20; i++) {
        const entry = {
          schemaVersion: 'banora.studio-draft/v1',
          id: `capacity-${i}`,
          filename: `capacity-${i}.sgf`,
          updatedAt: 0,
          revision: 1,
        };
        entries.put(entry);
        transaction.objectStore('drafts').put({
          ...entry,
          checkpoint: {
            schemaVersion: 'banora.checkpoint/v1',
            sgf: '(;SZ[5])',
            baselineSgf: '(;SZ[5])',
            selection: { gameIndex: 0, path: [] },
            rules: { suicide: 'forbid', ko: 'simple', passStones: false },
          },
        });
      }
    };
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onabort = reject;
    });
    db.close();
  });
  await studioControl(page, '#new', 'record', () => page.locator('#new').click());
  await page.locator('#unsaved button[value="discard"]').click();
  await expect(page.locator('#draft-status')).toHaveText(
    '20 drafts saved. Delete one to continue.',
  );
  await openDrafts(page);
  const capacity = (await records(page)).entries.find((item) => item.id.startsWith('capacity-'));
  await choose(page, capacity.id);
  await page.locator('#draft-delete').click();
  await page.locator('#draft-delete-cancel').click();
  if ((await records(page)).entries.length !== 20) throw Error('Cancelled deletion changed drafts');
  await page.locator('#draft-delete').click();
  await page.locator('#draft-delete').click();
  await expect(page.locator('#draft-message')).toHaveText('Draft deleted.');
  await page.locator('#draft-retry').click();
  await expect(page.locator('#draft-status')).toHaveText('Draft saved');
  if ((await records(page)).entries.length !== 20)
    throw Error('Retry after explicit deletion did not respect the cap');

  // Stored future payloads fail visibly without replacing the active document.
  await page.evaluate(async () => {
    const request = indexedDB.open('banora.studio.drafts', 1);
    await new Promise((resolve) => {
      request.onsuccess = resolve;
    });
    const db = request.result,
      tx = db.transaction(['entries', 'drafts'], 'readwrite');
    const entry = {
      schemaVersion: 'banora.studio-draft/v2',
      id: 'future-draft',
      filename: 'future.sgf',
      updatedAt: 0,
      revision: 1,
    };
    tx.objectStore('entries').put(entry);
    tx.objectStore('drafts').put({ ...entry, checkpoint: {} });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onabort = reject;
    });
    db.close();
  });
  await choose(page, 'future-draft');
  const futureEvent = page.waitForEvent('download');
  await page.locator('#draft-backup').click();
  await (await futureEvent).saveAs('output/playwright/recovery-future.banora.json');
  await page.locator('#draft-restore').click();
  await expect(page.locator('#draft-message')).toHaveText('Invalid backup. Current record kept.');
  await expect(page.locator('#board svg[data-board-width]')).toHaveAttribute(
    'data-board-width',
    '19',
  );
  await page.locator('#draft-delete').click();
  await page.locator('#draft-delete').click();
  await expect(page.locator('#draft-message')).toHaveText('Draft deleted.');

  // Import the actual downloaded portable backup; Cancel retains newer work.
  await choose(page, original.id);
  await page.locator('#draft-delete').click();
  await page.evaluate(async (id) => {
    const request = indexedDB.open('banora.studio.drafts', 1);
    await new Promise((resolve) => {
      request.onsuccess = resolve;
    });
    const db = request.result,
      tx = db.transaction(['entries', 'drafts'], 'readwrite');
    for (const name of ['entries', 'drafts']) {
      const store = tx.objectStore(name),
        value = store.get(id);
      value.onsuccess = () => store.put({ ...value.result, revision: value.result.revision + 1 });
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onabort = reject;
    });
    db.close();
  }, original.id);
  await page.locator('#draft-delete').click();
  await expect(page.locator('#draft-message')).toHaveText('Draft changed. Refresh or retry.');
  if (!(await records(page)).entries.some((entry) => entry.id === original.id))
    throw Error('Stale deletion removed a newer draft');
  await page.locator('#draft-close').click();
  await page.locator('#comment').fill('before restore');
  await page.locator('#comment').blur();
  await openDrafts(page);
  await page.locator('#backup-file').setInputFiles('output/playwright/recovery.banora.json');
  await expect(page.locator('#unsaved')).toBeVisible();
  await page.locator('#unsaved button[value="cancel"]').click();
  await expect(page.locator('#comment')).toHaveValue('before restore');
  await expect(page.locator('#backup-open')).not.toBeDisabled();
  await page.locator('#backup-file').setInputFiles('output/playwright/recovery.banora.json');
  await expect(page.locator('#unsaved')).toBeVisible();
  const guardedEvent = page.waitForEvent('download');
  await page.locator('#unsaved button[value="export"]').click();
  await (await guardedEvent).saveAs('output/playwright/recovery-before-restore.sgf');
  await expect(page.locator('#comment')).toHaveValue('unfinished 한국어 <tag>');
  await expect(page.locator('#dirty')).toHaveText('Unsaved changes');
  await openDrafts(page);
  await page
    .locator('#backup-file')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.locator('#draft-message')).toHaveText('Invalid backup. Current record kept.');
  await expect(page.locator('#comment')).toHaveValue('unfinished 한국어 <tag>');
  for (const [locale, label] of [
    ['ko', '로컬 초안'],
    ['zh', '本地草稿'],
    ['ja', 'ローカル下書き'],
    ['en', 'Local drafts'],
  ]) {
    await page.locator('#draft-close').click();
    await page.locator('#language').selectOption(locale);
    await expect(page.locator('#drafts-open')).toHaveText(label);
    await openDrafts(page);
  }
  await page.setViewportSize({ width: 320, height: 700 });
  await page.screenshot({ path: 'output/playwright/recovery-mobile.png' });
  if (
    !(await page
      .locator('#drafts-dialog')
      .evaluate((element) => element.getBoundingClientRect().width <= 296))
  )
    throw Error('Recovery dialog overflowed mobile viewport');
  await page.locator('#draft-close').click();
  await page.setViewportSize({ width: 1440, height: 960 });
  await openDrafts(page);
  await page.screenshot({ path: 'output/playwright/recovery-desktop.png' });
  await page.locator('#draft-close').click();
  const exportEvent = page.waitForEvent('download');
  await page.locator('#export').click();
  await (await exportEvent).saveAs('output/playwright/recovery-reopened.sgf');
  await openDrafts(page);
  await studioControl(page, '#draft-autosave', 'drafts', () =>
    page.locator('#draft-autosave').uncheck(),
  );
  await page.locator('#draft-close').click();
  await page.reload();
  await expect(page.locator('#draft-status')).toHaveText('Autosave off');
  await openDrafts(page);
  await expect(page.locator('#draft-autosave')).not.toBeChecked();
  await studioControl(page, '#draft-autosave', 'drafts', () =>
    page.locator('#draft-autosave').check(),
  );
  await page.locator('#draft-close').click();

  const denied = await page.context().newPage();
  denied.on('dialog', (dialog) => dialog.accept());
  await denied.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('Fixture denial', 'SecurityError');
    };
  });
  await denied.goto(`${address}/studio/`);
  await denied.locator('#comment').fill('denied but editable');
  await denied.locator('#comment').blur();
  await expect(denied.locator('#draft-status')).toHaveText(
    'Local storage unavailable. Download a backup.',
  );
  await openDrafts(denied);
  const deniedEvent = denied.waitForEvent('download');
  await denied.locator('#backup-save').click();
  await (await deniedEvent).saveAs('output/playwright/recovery-denied.banora.json');
  await expect(denied.locator('#dirty')).toHaveText('Unsaved changes');
  await denied.close();
  await page.close();
  if (errors.length) throw Error(`Recovery page errors: ${errors.join('; ')}`);
  return 'banora-recovery-complete';
};
