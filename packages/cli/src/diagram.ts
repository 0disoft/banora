import { RecordController } from '@0disoft/banora/controller';
import { DEFAULT_SGF_LIMITS } from '@0disoft/banora/sgf';
import type { RecordLocator } from '@0disoft/banora/sgf';
import type { BoardSnapshot } from '@0disoft/banora/board-state';
import type { DiagramSvgOptions } from '@0disoft/banora/diagram';
import { CliError, json } from './io.js';

type Flags = Readonly<Partial<Record<string, string | boolean>>>;
type Reader = (path: string) => Promise<Buffer>;

function selection(flags: Flags): { game: number; path: number[] | undefined } {
  const gameText = flags.game;
  if (
    gameText !== undefined &&
    (typeof gameText !== 'string' ||
      !/^\d+$/.test(gameText) ||
      !Number.isSafeInteger(Number(gameText)))
  )
    throw new CliError('usage', '--game requires a nonnegative decimal integer.');
  const pathText = flags.path;
  if (pathText === undefined) return { game: Number(gameText ?? 0), path: undefined };
  if (pathText === 'root') return { game: Number(gameText ?? 0), path: [] };
  if (typeof pathText !== 'string' || !/^\d+(,\d+)*$/.test(pathText))
    throw new CliError(
      'usage',
      '--path requires root or comma-separated nonnegative child indices.',
    );
  const path = pathText.split(',').map(Number);
  if (
    path.length > DEFAULT_SGF_LIMITS.maxNodes ||
    path.some((index) => !Number.isSafeInteger(index))
  )
    throw new CliError('usage', '--path exceeds the SGF node limit or contains an invalid index.');
  return { game: Number(gameText ?? 0), path };
}

/** Only owns its temporary controller. File publication stays in the shared CLI I/O layer. */
export async function renderDiagramCommand(
  flags: Flags,
  read: Reader,
): Promise<{
  svg: string;
  source: 'sgf' | 'snapshot';
  selection?: RecordLocator;
}> {
  const input = typeof flags.input === 'string' ? flags.input : undefined;
  const state = typeof flags.state === 'string' ? flags.state : undefined;
  if (Boolean(input) === Boolean(state))
    throw new CliError('usage', 'diagram requires exactly one of --input SGF or --state JSON.');
  if (state && (flags.game !== undefined || flags.path !== undefined))
    throw new CliError('usage', '--game and --path apply only to SGF input.');
  if ((input ?? state) === '-' && flags.options === '-')
    throw new CliError('usage', 'Stdin may supply only one input.');
  const selected = selection(flags);
  // Older SDK peers can still run existing commands. Only this new capability
  // requires the additive selective entrypoint from a matching SDK build.
  let render: typeof import('@0disoft/banora/diagram').renderDiagramSvg;
  try {
    ({ renderDiagramSvg: render } = await import('@0disoft/banora/diagram'));
    if (typeof render !== 'function') throw new Error('Missing renderer');
  } catch {
    throw new CliError(
      'input',
      'SVG diagrams require a matching Banora SDK build with the diagram entrypoint.',
    );
  }
  const bytes = await read((input ?? state)!);
  const options = (
    typeof flags.options === 'string' ? json(await read(flags.options)) : {}
  ) as DiagramSvgOptions;
  const draw = (source: Parameters<typeof render>[0]) => {
    try {
      return render(source, options);
    } catch (error) {
      if (error instanceof RangeError && error.message === 'SVG diagram exceeds 8 MiB')
        throw new CliError('limit', 'SVG diagram exceeds 8 MiB.');
      throw new CliError(
        'input',
        'SVG diagram source or options are invalid or exceed supported limits.',
      );
    }
  };
  if (state) return { svg: draw(json(bytes) as BoardSnapshot), source: 'snapshot' };
  let controller: RecordController;
  try {
    controller = new RecordController({ sgf: bytes });
  } catch {
    throw new CliError('input', 'SGF input is invalid, unsupported or exceeds supported limits.');
  }
  try {
    let node = controller.getState().record.games[selected.game];
    if (!node) throw new CliError('input', 'Selected SGF game does not exist.');
    const path: number[] = [];
    if (selected.path !== undefined) {
      for (const index of selected.path) {
        node = node.children[index];
        if (!node) throw new CliError('input', 'Selected SGF path does not exist.');
        path.push(index);
      }
    } else {
      while (node.children[0]) {
        if (path.length >= DEFAULT_SGF_LIMITS.maxNodes)
          throw new CliError('limit', 'Selected SGF path exceeds the node limit.');
        node = node.children[0];
        path.push(0);
      }
    }
    if (!controller.goTo(node.id).ok)
      throw new CliError('input', 'Selected SGF node is unavailable.');
    return {
      svg: draw(controller.getState()),
      source: 'sgf',
      selection: { gameIndex: selected.game, path },
    };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('input', 'Selected SGF position cannot be replayed.');
  } finally {
    controller.dispose();
  }
}
