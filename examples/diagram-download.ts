import type { BoardView, ViewerView } from '@0disoft/banora';

export async function downloadDiagram(
  view: BoardView | ViewerView | null,
  format: 'svg' | 'png',
  filename: string,
) {
  if (!view) throw new Error('Mount a view before exporting');
  const blob =
    format === 'svg'
      ? new Blob([view.exportSvg({ width: 640 })], { type: 'image/svg+xml;charset=utf-8' })
      : await view.exportPng({ width: 640 });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
