// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const source = {
      key: 'headless-parity',
      width: 5,
      height: 3,
      stones: Array.from({ length: 15 }, (_, index) =>
        index === 0 ? 'black' : index === 14 ? 'white' : null,
      ),
      numbers: [
        { point: { x: 0, y: 0 }, value: 12 },
        { point: { x: 4, y: 2 }, value: 13 },
      ],
      lastMove: { x: 4, y: 2 },
      markers: [
        { kind: 'triangle', point: { x: 2, y: 1 } },
        { kind: 'label', point: { x: 1, y: 1 }, label: '<&漢😀' },
      ],
      connections: [{ kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 4, y: 2 } }],
      strokes: [
        {
          id: 'test',
          points: [
            { x: 0.2, y: 1 },
            { x: 1.5, y: 2 },
          ],
          color: '#123456',
          width: 0.1,
        },
      ],
      overlays: [
        { kind: 'heatmap', point: { x: 3, y: 1 }, color: '#dd8844', opacity: 0.4 },
        { kind: 'badge', point: { x: 3, y: 2 }, color: '#118844', label: 'A' },
      ],
      dimPoints: [{ x: 4, y: 2 }],
    };
    const raster = async (svg) => {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const options = {
      width: 325,
      theme: 'flat',
      moveNumbers: true,
      transform: { rotation: 90, flipX: true },
      title: '<Safe> "diagram"',
    };
    const before = JSON.stringify(source);
    for (const visibility of [
      undefined,
      [
        { x: 0, y: 0 },
        { x: 4, y: 2 },
      ],
      [],
    ]) {
      const host = document.createElement('div');
      document.body.append(host);
      const state = { ...source, visiblePoints: visibility };
      const view = sdk.mountControlledBoard(host, { ...options, state });
      try {
        const headless = sdk.renderDiagramSvg(state, options);
        const xml = new DOMParser().parseFromString(headless, 'image/svg+xml');
        if (xml.querySelector('parsererror') || xml.documentElement.localName !== 'svg')
          throw Error('Headless output is not standalone XML');
        const expectedSvg = view.exportSvg({ width: options.width, title: options.title });
        const expected = await raster(expectedSvg);
        const actual = await raster(headless);
        if (
          expected.length !== actual.length ||
          expected.some((value, index) => value !== actual[index])
        ) {
          const first = expected.findIndex((value, index) => value !== actual[index]);
          throw Error(
            `Headless and mounted SVG pixels differ: ${JSON.stringify({ first, masked: visibility !== undefined, expectedBytes: expected.length, actualBytes: actual.length })}`,
          );
        }
        if (visibility?.length === 0 && xml.querySelectorAll('clipPath rect').length !== 0)
          throw Error('An empty visibility mask retained intersections');
      } finally {
        view.dispose();
        host.remove();
      }
    }
    if (JSON.stringify(source) !== before) throw Error('Headless render mutated the source');
  });
  return 'banora-headless-diagrams-complete';
};
