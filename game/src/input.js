// Keyboard and pointer input. Held keys give climb and throttle; one-shot presses
// (start or restart, pause, boost) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice.
// The pointer steers too: move the mouse and the plane eases toward its height;
// hold the button (or touch) for boost.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const CLIMB = new Set(['ArrowUp', 'KeyW']);
const DIVE = new Set(['ArrowDown', 'KeyS']);
const SLOW = new Set(['ArrowLeft', 'KeyA']);
const FAST = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const BOOST = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(target) {
  let climb = false;
  let dive = false;
  let slow = false;
  let fast = false;
  let boostKey = false;
  let actions = 0;
  let pointerY = null;
  let pointerBoost = false;

  function press(event) {
    if (CLIMB.has(event.code)) climb = true;
    else if (DIVE.has(event.code)) dive = true;
    else if (SLOW.has(event.code)) slow = true;
    else if (FAST.has(event.code)) fast = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (BOOST.has(event.code)) {
      boostKey = true;
    } else return;
    event.preventDefault();
  }

  window.addEventListener('keydown', press);
  window.addEventListener('keyup', (event) => {
    if (CLIMB.has(event.code)) climb = false;
    else if (DIVE.has(event.code)) dive = false;
    else if (SLOW.has(event.code)) slow = false;
    else if (FAST.has(event.code)) fast = false;
    else if (BOOST.has(event.code)) boostKey = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    climb = false;
    dive = false;
    slow = false;
    fast = false;
    boostKey = false;
    pointerBoost = false;
  });

  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    pointerY = event.clientY - rect.top;
  });
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    pointerY = event.clientY - rect.top;
    pointerBoost = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    pointerBoost = false;
  });

  return {
    /** -1 to climb, 1 to dive, 0 for neither or both. */
    climbDirection() {
      return (dive ? 1 : 0) - (climb ? 1 : 0);
    },
    /** -1 to slow down, 1 to speed up, 0 for neither or both. */
    throttleDirection() {
      return (fast ? 1 : 0) - (slow ? 1 : 0);
    },
    /** The pointer's height over the canvas, or null when it never moved. */
    pointerHeight() {
      return pointerY;
    },
    /** True while the pointer button (or touch) is held. */
    pointerBoosting() {
      return pointerBoost;
    },
    /** True while a boost key is held down. */
    keyBoosting() {
      return boostKey;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
