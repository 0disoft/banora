// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const host = document.createElement('div');
    host.style.width = '640px';
    document.body.append(host);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const context = canvas.getContext('2d');
    context.fillStyle = '#123456';
    context.fillRect(0, 0, 16, 16);
    const tile = sdk.createStoneTexture(canvas.toDataURL('image/png'));
    const size = 19;
    const view = sdk.mountControlledBoard(host, {
      state: {
        key: 'paint-lookup',
        width: size,
        height: size,
        stones: Array.from({ length: size * size }, (_, i) => (i % 2 ? 'black' : 'white')),
      },
      stoneTextures: { black: tile, white: tile },
    });
    const svg = host.querySelector('svg');
    const query = svg.querySelectorAll;
    let calls = 0;
    svg.querySelectorAll = function (selector) {
      if (selector === 'defs > pattern') calls++;
      return query.call(this, selector);
    };
    try {
      const text = view.exportSvg();
      const exported = new DOMParser().parseFromString(text, 'image/svg+xml');
      if (
        exported.querySelector('parsererror') ||
        exported.querySelectorAll('pattern').length !== 2
      )
        throw Error('Textured diagram lost its definitions');
      if (calls !== 1 || exported.querySelectorAll('[data-texture]').length !== size * size)
        throw Error('Textured export must scan definitions once and retain all stones');
      const rejected = () => {
        try {
          view.exportSvg();
        } catch (error) {
          if (error.message === 'External or inherited paint references cannot be exported') return;
          throw error;
        }
        throw Error('Invalid paint reference was exported');
      };
      const pattern = svg.querySelector('defs > pattern');
      const replacement = pattern.cloneNode(false);
      pattern.replaceWith(replacement);
      try {
        rejected();
      } finally {
        replacement.replaceWith(pattern);
      }
      const duplicate = pattern.cloneNode(false);
      pattern.before(duplicate);
      try {
        rejected();
      } finally {
        duplicate.remove();
      }
      const stone = svg.querySelector('[data-texture]');
      const computed = window.getComputedStyle;
      window.getComputedStyle = (element, pseudo) => {
        const style = computed.call(window, element, pseudo);
        return {
          getPropertyValue: (key) =>
            element === stone && key === 'fill'
              ? `url("${location.origin}/external-paint.svg#missing")`
              : style.getPropertyValue(key),
        };
      };
      try {
        rejected();
      } finally {
        window.getComputedStyle = computed;
      }
      calls = 0;
      view.exportSvg();
      if (calls !== 1) throw Error('Each export must own its definition lookup');
      view.update({ stoneTextures: null });
      calls = 0;
      view.exportSvg();
      if (calls !== 0) throw Error('Plain export needlessly scanned texture definitions');
    } finally {
      svg.querySelectorAll = query;
      view.dispose();
      host.remove();
      canvas.width = canvas.height = 0;
    }
  });
  return 'banora-diagram-paint-complete';
};
