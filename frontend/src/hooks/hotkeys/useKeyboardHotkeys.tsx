import { noop, unset } from 'lodash-es';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react';

interface KeyboardHotkeysContextReturnValue {
	/**
	 * @param keyCombination provide the string for which the subsequent callback should be triggered. Example 'ctrl+a'
	 * @param callback the callback that should be triggered when the above key combination is being pressed
	 * @returns void
	 */
	registerShortcut: (keyCombination: string, callback: () => void) => void;

	/**
	 *
	 * @param keyCombination provide the string for which we want to deregister the callback
	 * @returns void
	 */
	deregisterShortcut: (keyCombination: string) => void;
}

const KeyboardHotkeysContext = createContext<KeyboardHotkeysContextReturnValue>(
	{
		registerShortcut: noop,
		deregisterShortcut: noop,
	},
);

const IGNORE_INPUTS = ['input', 'textarea']; // Inputs in which hotkey events will be ignored

const useKeyboardHotkeys = (): KeyboardHotkeysContextReturnValue => {
	const context = useContext(KeyboardHotkeysContext);
	if (!context) {
		throw new Error(
			'useKeyboardHotkeys must be used within a KeyboardHotkeysProvider',
		);
	}

	return context;
};

function KeyboardHotkeysProvider({
	children,
}: {
	children: JSX.Element;
}): JSX.Element {
	const shortcuts = useRef<Record<string, () => void>>({});

	const handleKeyPress = (event: KeyboardEvent): void => {
		const { key, ctrlKey, altKey, shiftKey, metaKey, target } = event;

		if (IGNORE_INPUTS.includes((target as HTMLElement).tagName.toLowerCase())) {
			return;
		}

		// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
		const modifiers = { ctrlKey, altKey, shiftKey, metaKey };

		let shortcutKey = `${key.toLowerCase()}`;

		const isAltKey = `${modifiers.altKey ? '+alt' : ''}`;
		const isShiftKey = `${modifiers.shiftKey ? '+shift' : ''}`;

		// ctrl and cmd have the same functionality for mac and windows parity
		const isMetaKey = `${modifiers.metaKey || modifiers.ctrlKey ? '+meta' : ''}`;

		shortcutKey = shortcutKey + isAltKey + isShiftKey + isMetaKey;

		if (shortcuts.current[shortcutKey]) {
			event.preventDefault();
			event.stopImmediatePropagation();

			shortcuts.current[shortcutKey]();
		}
	};

	useEffect(() => {
		document.addEventListener('keydown', handleKeyPress);
		return (): void => {
			document.removeEventListener('keydown', handleKeyPress);
		};
	}, []);

	const registerShortcut = useCallback(
		(keyCombination: string, callback: () => void): void => {
			if (!shortcuts.current[keyCombination]) {
				shortcuts.current[keyCombination] = callback;
			} else if (process.env.NODE_ENV === 'development') {
				throw new Error(
					`This shortcut is already present in current scope :- ${keyCombination}`,
				);
			} else {
				console.error(
					`This shortcut is already present in current scope :- ${keyCombination}`,
				);
			}
		},
		[shortcuts],
	);

	const deregisterShortcut = useCallback(
		(keyCombination: string): void => {
			if (shortcuts.current[keyCombination]) {
				unset(shortcuts.current, keyCombination);
			}
		},
		[shortcuts],
	);

	const contextValue = useMemo(
		() => ({
			registerShortcut,
			deregisterShortcut,
		}),
		[registerShortcut, deregisterShortcut],
	);

	return (
		<KeyboardHotkeysContext.Provider value={contextValue}>
			{children}
		</KeyboardHotkeysContext.Provider>
	);
}

export { KeyboardHotkeysProvider, useKeyboardHotkeys };
