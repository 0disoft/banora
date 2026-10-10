import type { BoardOptions, BoardView, ControllerState, ViewerOptions, ViewerView } from '@banora/sdk';

export interface ContainerProps {
  readonly class?: string;
  readonly style?: string;
  readonly ariaLabel?: string;
  readonly onStateChange?: (state: ControllerState) => void;
  readonly onView?: (view: BoardView | ViewerView | null) => void;
}
export type BoardProps = BoardOptions & ContainerProps;
export type ViewerProps = Omit<ViewerOptions, 'sgf'> & ContainerProps;
