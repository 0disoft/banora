import { createElement, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { mountControlledBoard } from '@banora/sdk/controlled-board';
import type { ControlledBoardOptions, ControlledBoardView } from '@banora/sdk/controlled-board';

export interface ControlledBoardProps extends ControlledBoardOptions {
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
  readonly onView?: (view: ControlledBoardView | null) => void;
}
export function ControlledBoard(props: ControlledBoardProps) {
  const onView = props.onView;
  const container = useRef<HTMLDivElement>(null),
    view = useRef<ControlledBoardView | null>(null);
  const options = useMemo(
    () => ({
      state: props.state,
      onIntent: props.onIntent,
      readOnly: props.readOnly,
      theme: props.theme,
      coordinates: props.coordinates,
      moveNumbers: props.moveNumbers,
      crop: props.crop,
      transform: props.transform,
      drawing: props.drawing,
      touch: props.touch,
      stoneTextures: props.stoneTextures,
      contextMenu: props.contextMenu,
      labels: props.labels,
    }),
    [
      props.state,
      props.onIntent,
      props.readOnly,
      props.theme,
      props.coordinates,
      props.moveNumbers,
      props.crop,
      props.transform,
      props.drawing,
      props.touch,
      props.stoneTextures,
      props.contextMenu,
      props.labels,
    ],
  );
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  }, [options]);
  useEffect(() => {
    if (!container.current) return;
    const mounted = mountControlledBoard(container.current, latest.current);
    view.current = mounted;
    return () => {
      mounted.dispose();
      if (view.current === mounted) view.current = null;
    };
  }, []);
  useEffect(() => {
    view.current?.update(options);
  }, [options]);
  useEffect(() => {
    onView?.(view.current);
    return () => onView?.(null);
  }, [onView]);
  // oxlint-disable-next-line react/refs -- createElement forwards the ref object; render never reads current.
  return createElement('div', {
    ref: container,
    className: props.className,
    style: props.style,
    'aria-label': props.ariaLabel ?? 'Banora controlled board',
  });
}
