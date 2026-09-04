export interface BlockedNavigation {
	id: number;
	/** History method the app called, e.g. `push`, `replace`, `window.open`. */
	via: string;
	/** Target the app tried to reach, already resolved to an href. */
	to: string;
}

type Listener = () => void;

let blockedNavigations: BlockedNavigation[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const emit = (): void => {
	listeners.forEach((listener) => listener());
};

export const subscribeToBlockedNavigations = (
	listener: Listener,
): (() => void) => {
	listeners.add(listener);
	return (): void => {
		listeners.delete(listener);
	};
};

export const getBlockedNavigations = (): BlockedNavigation[] =>
	blockedNavigations;

export const recordBlockedNavigation = (via: string, to: string): void => {
	blockedNavigations = [...blockedNavigations, { id: nextId, via, to }];
	nextId += 1;
	emit();
};

export const clearBlockedNavigations = (): void => {
	blockedNavigations = [];
	emit();
};
