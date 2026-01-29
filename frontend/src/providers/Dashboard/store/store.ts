import { produce } from 'immer';
type ListenerFn = () => void;

export default function createStore<T>(
	init: T,
): {
	set: (setter: any) => void;
	update: (updater: (draft: T) => void) => void;
	subscribe: (listener: ListenerFn) => () => void;
	getSnapshot: () => T;
} {
	let listeners: ListenerFn[] = [];
	let state = init;

	function emitChange(): void {
		for (const listener of listeners) {
			listener();
		}
	}

	function set(setter: any): void {
		state = produce(state, setter);
		emitChange();
	}

	function update(updater: (draft: T) => void): void {
		state = produce(state, updater);
		emitChange();
	}

	return {
		set,
		update,
		subscribe(listener: ListenerFn): () => void {
			listeners = [...listeners, listener];
			return (): void => {
				listeners = listeners.filter((l) => l !== listener);
			};
		},
		getSnapshot(): T {
			return state;
		},
	};
}
