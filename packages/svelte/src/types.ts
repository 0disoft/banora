import type {
  BoardOptions,
  BoardView,
  ControllerState,
  ViewerOptions,
  ViewerView,
} from '@0disoft/banora';

export interface ContainerProps {
  readonly class?: string;
  readonly style?: string;
  readonly ariaLabel?: string;
  readonly onStateChange?: (state: ControllerState) => void;
  readonly onView?: (view: BoardView | ViewerView | null) => void;
}
export type BoardProps = BoardOptions & ContainerProps;
export type ViewerProps = Omit<ViewerOptions, 'sgf'> & ContainerProps;
export type ControlledBoardProps =
  import('@0disoft/banora/controlled-board').ControlledBoardOptions &
    Omit<ContainerProps, 'onStateChange' | 'onView'> & {
      readonly onView?: (
        view: import('@0disoft/banora/controlled-board').ControlledBoardView | null,
      ) => void;
    };
