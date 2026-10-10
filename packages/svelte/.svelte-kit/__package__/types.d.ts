import type { BoardOptions, ControllerState, ViewerOptions } from '@banora/sdk';
export interface ContainerProps {
    readonly class?: string;
    readonly style?: string;
    readonly ariaLabel?: string;
    readonly onStateChange?: (state: ControllerState) => void;
}
export type BoardProps = BoardOptions & ContainerProps;
export type ViewerProps = Omit<ViewerOptions, 'sgf'> & ContainerProps;
