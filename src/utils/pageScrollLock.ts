type BodyScrollStyle = Pick<
  CSSStyleDeclaration,
  'position' | 'top' | 'left' | 'right' | 'width' | 'overflow'
>;

type RootScrollStyle = Pick<CSSStyleDeclaration, 'overflow' | 'overscrollBehavior' | 'overscrollBehaviorY'>;

interface ScrollLockState {
  locks: Set<symbol>;
  scrollY: number;
  bodyStyle: BodyScrollStyle | null;
  rootStyle: RootScrollStyle | null;
}

type ScrollLockWindow = Window & { __myWalletScrollLock?: ScrollLockState };

const getScrollLockState = () => {
  const host = window as ScrollLockWindow;
  host.__myWalletScrollLock ??= {
    locks: new Set(),
    scrollY: 0,
    bodyStyle: null,
    rootStyle: null,
  };
  return host.__myWalletScrollLock;
};

/** Locks the page behind a dialog. Every caller owns one idempotent token. */
export const lockPageScroll = () => {
  const state = getScrollLockState();
  const lock = Symbol('page-scroll-lock');

  if (state.locks.size === 0) {
    const body = document.body;
    const root = document.documentElement;

    state.scrollY = window.scrollY;
    state.bodyStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    state.rootStyle = {
      overflow: root.style.overflow,
      overscrollBehavior: root.style.overscrollBehavior,
      overscrollBehaviorY: root.style.overscrollBehaviorY,
    };

    Object.assign(body.style, {
      position: 'fixed',
      top: `-${state.scrollY}px`,
      left: '0',
      right: '0',
      width: '100%',
      overflow: 'hidden',
    });
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
  }

  state.locks.add(lock);
  let released = false;

  return () => {
    if (released) return;
    released = true;
    state.locks.delete(lock);
    if (state.locks.size > 0 || !state.bodyStyle || !state.rootStyle) return;

    const restoreY = state.scrollY;
    Object.assign(document.body.style, state.bodyStyle);
    Object.assign(document.documentElement.style, state.rootStyle);
    state.bodyStyle = null;
    state.rootStyle = null;

    requestAnimationFrame(() => {
      if (state.locks.size === 0) window.scrollTo({ top: restoreY, left: 0, behavior: 'auto' });
    });
  };
};
