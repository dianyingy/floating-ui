import * as FloatingUI from '@floating-ui/react';
import {
  cloneElement,
  Fragment,
  useEffect,
  useRef,
  useState,
} from 'react';
import {flushSync} from 'react-dom';

function roundByDPR(value) {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(value * dpr) / dpr;
}

export function Floating({
  children,
  content,
  strategy: strategyOption,
  tooltipStyle = {},
  middleware = [],
  portaled,
  minHeight,
  transition,
  arrow,
  lockedFromArrow,
  ...options
}) {
  const arrowRef = useRef();
  const {
    x,
    y,
    middlewareData,
    refs,
    placement,
    strategy,
    isPositioned,
  } = FloatingUI.useFloating({
    whileElementsMounted: FloatingUI.autoUpdate,
    strategy: strategyOption,
    middleware:
      [
        ...middleware,
        ...(arrow
          ? [FloatingUI.arrow({element: arrowRef, padding: 5})]
          : []),
        ...(lockedFromArrow
          ? [
              FloatingUI.shift(
                middleware.find((m) => m.name === 'shift')
                  .options
              ),
            ]
          : []),
      ]
        ?.map(({name, options}) => {
          if (name === 'size') {
            return FloatingUI.size?.({
              ...options,
              apply: ({availableHeight}) => {
                Object.assign(
                  refs.floating.current.style ?? {},
                  {
                    maxHeight: minHeight
                      ? `${Math.max(
                          availableHeight,
                          minHeight
                        )}px`
                      : `${Math.max(availableHeight, 0)}px`,
                  }
                );
              },
            });
          }

          if (name === 'hide') {
            return [
              FloatingUI.hide(),
              FloatingUI.hide({strategy: 'escaped'}),
            ];
          }

          return FloatingUI[name]?.(options);
        })
        .flat()
        .filter((v) => v) ?? [],
    ...options,
  });

  const [moveTransition, setMoveTransition] = useState(false);

  useEffect(() => {
    function handleResize() {
      flushSync(() => setMoveTransition(false));
      requestAnimationFrame(() => setMoveTransition(transition));
    }

    if (isPositioned && transition) {
      setMoveTransition(true);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isPositioned, transition, refs.floating]);

  const staticSide = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top',
  }[placement.split('-')[0]];

  const roundedX = x != null ? roundByDPR(x) : 0;
  const roundedY = y != null ? roundByDPR(y) : 0;

  const tooltipJsx = (
    <div
      className="z-10 grid place-items-center rounded bg-gray-800 text-gray-50"
      ref={refs.setFloating}
      style={{
        ...tooltipStyle,
        position: strategy,
        left: 0,
        top: 0,
        transform: `translate3d(${roundedX}px,${roundedY}px,0)`,
        backgroundColor: middlewareData.hide?.escaped
          ? 'red'
          : undefined,
        visibility:
          middlewareData.hide?.referenceHidden || !isPositioned
            ? 'hidden'
            : undefined,
        transition: moveTransition
          ? 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)'
          : undefined,
      }}
    >
      <div className="px-2 py-2">{content ?? 'Floating'}</div>
      {arrow && (
        <div
          ref={arrowRef}
          className="h-4 w-4 bg-gray-800 [left:-0.5rem]"
          style={{
            position: 'absolute',
            left:
              middlewareData.arrow?.x != null
                ? middlewareData.arrow.x
                : undefined,
            top:
              middlewareData.arrow?.y != null
                ? middlewareData.arrow.y
                : undefined,
            right: undefined,
            bottom: undefined,
            [staticSide]: lockedFromArrow ? '-0.5rem' : '-1rem',
            background: lockedFromArrow ? 'inherit' : 'red',
            transition: lockedFromArrow
              ? 'transform 0.2s ease'
              : 'none',
            transform: lockedFromArrow
              ? middlewareData.arrow?.centerOffset !== 0
                ? 'translateX(1rem) rotate(45deg)'
                : 'rotate(45deg)'
              : '',
          }}
        />
      )}
    </div>
  );

  const Wrapper = portaled
    ? FloatingUI.FloatingPortal
    : Fragment;

  return (
    <>
      {cloneElement(children, {ref: refs.setReference})}
      <Wrapper>{tooltipJsx}</Wrapper>
    </>
  );
}
