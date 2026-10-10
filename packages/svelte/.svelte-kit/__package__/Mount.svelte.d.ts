import type { BoardOptions, RecordController, ViewerOptions } from '@banora/sdk';
import type { ContainerProps } from './types.js';
interface Props extends ContainerProps {
    kind: 'board' | 'viewer';
    controller?: RecordController;
    options: BoardOptions | ViewerOptions;
}
declare const Mount: import("svelte").Component<Props, {}, "">;
type Mount = ReturnType<typeof Mount>;
export default Mount;
