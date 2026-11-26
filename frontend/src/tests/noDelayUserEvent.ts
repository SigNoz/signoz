import type userEvent from '@testing-library/user-event';

type SetupOptions = NonNullable<Parameters<typeof userEvent.setup>[0]>;

// The default `delay: 0` still awaits a timer after every key and click.
// Keep it when a test checks what happens between two actions, such as a
// debounce per key: with `null` that code runs only after the whole action.
export const NO_DELAY_USER_EVENT = {
	delay: null,
} as const satisfies SetupOptions;
