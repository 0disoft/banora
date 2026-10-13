import { pointToSgf } from '@0disoft/banora';
import type { Color, Point, RecordController, SgfNode } from '@0disoft/banora';
import { translateUi } from '../ui-language.js';

/** Point tools change placement; an explicit SDK setup may also reset rules history. */
export function applySetupPoint(
  controller: Pick<RecordController, 'getState' | 'setSetup' | 'goTo'>,
  point: Point,
  color: Color | null,
) {
  const state = controller.getState();
  if (state.position.board[point.y * state.position.width + point.x] === color) return undefined;
  const key = color === null ? 'AE' : color === 'black' ? 'AB' : 'AW';
  const existing = state.node.children.find(
    (child) =>
      Object.keys(child.properties).length === 1 &&
      child.properties[key]?.length === 1 &&
      child.properties[key][0] === pointToSgf(point),
  );
  return existing
    ? { result: controller.goTo(existing.id), operation: 'navigate' as const }
    : { result: controller.setSetup([{ ...point, color }]), operation: 'edit' as const };
}

export function coordinateTitle(value: string, height: number): string {
  const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const x = alphabet.indexOf(value[0]!);
  const y = alphabet.indexOf(value[1]!);
  return `${letters[x] ?? x + 1}${height - y}`;
}

export function setupNodeTitle(node: SgfNode, height: number): string | undefined {
  const setupKeys = (['AB', 'AW', 'AE'] as const).filter((key) => node.properties[key]?.length);
  if (setupKeys.length === 1 && !node.properties.PL) {
    const key = setupKeys[0]!;
    const label = translateUi(
      key === 'AE'
        ? 'Remove stones (setup)'
        : key === 'AB'
          ? 'Black stones (setup)'
          : 'White stones (setup)',
    );
    const points = node.properties[key]!;
    return points.length === 1 && points[0]!.length === 2
      ? `${label} ${coordinateTitle(points[0]!, height)}`
      : label;
  }
  return setupKeys.length || node.properties.PL ? translateUi('Setup change') : undefined;
}
