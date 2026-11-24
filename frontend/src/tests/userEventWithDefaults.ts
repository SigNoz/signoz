type UserEventModule = typeof import('@testing-library/user-event');
type UserEvent = UserEventModule['default'];
type DirectMethod = Exclude<keyof UserEvent, 'setup'>;

const actual = jest.requireActual<UserEventModule>(
	'@testing-library/user-event',
);
const userEvent = actual.default;

// The pointer-events check walks getComputedStyle up the tree on every action.
const DEFAULTS = {
	pointerEventsCheck: actual.PointerEventsCheckLevel.Never,
};

// Position of the options argument in each direct API call.
const OPTIONS_INDEX: Record<Exclude<DirectMethod, 'clear'>, number> = {
	copy: 0,
	cut: 0,
	tab: 0,
	click: 1,
	dblClick: 1,
	tripleClick: 1,
	hover: 1,
	unhover: 1,
	keyboard: 1,
	pointer: 1,
	paste: 1,
	deselectOptions: 2,
	selectOptions: 2,
	type: 2,
	upload: 2,
};

const withDefaults =
	(name: DirectMethod, optionsIndex: number) =>
	(...args: unknown[]): Promise<unknown> => {
		const next = [...args];
		next[optionsIndex] = {
			...DEFAULTS,
			...(next[optionsIndex] as object | undefined),
		};
		return Reflect.apply(userEvent[name], userEvent, next);
	};

const directApi = Object.fromEntries(
	Object.entries(OPTIONS_INDEX).map(([name, index]) => [
		name,
		withDefaults(name as DirectMethod, index),
	]),
);

const userEventWithDefaults: UserEvent = {
	...userEvent,
	...directApi,
	clear: (element) => userEvent.setup(DEFAULTS).clear(element),
	setup: (options) => userEvent.setup({ ...DEFAULTS, ...options }),
};

export const { PointerEventsCheckLevel } = actual;
export default userEventWithDefaults;
