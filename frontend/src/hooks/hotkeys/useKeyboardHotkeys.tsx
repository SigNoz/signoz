import { noop, unset } from 'lodash-es';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react';

import { useCmdK } from '../../providers/cmdKProvider';

interface KeyboardHotkeysContextReturnValue {
	/**
	 * @param keyCombo provide the string for which the subsequent callback should be triggered. Example 'ctrl+a'
	 * @param callback the callback that should be triggered when the above key combination is being pressed
	 * @returns void
	 */
	registerShortcut: (keyCombo: string, callback: () => void) => void;
	/**
	 *
	 * @param keyCombo provide the string for which we want to deregister the callback
	 * @returns void
	 */
	deregisterShortcut: (keyCombo: string) => void;
}

const KeyboardHotkeysContext = createContext<KeyboardHotkeysContextReturnValue>(
	{
		registerShortcut: noop,
		deregisterShortcut: noop,
	},
);

const IGNORE_INPUTS = ['input', 'textarea', 'cm-editor']; // Inputs in which hotkey events will be ignored

export function useKeyboardHotkeys(): KeyboardHotkeysContextReturnValue {
	const context = useContext(KeyboardHotkeysContext);
	if (!context) {
		throw new Error(
			'useKeyboardHotkeys must be used within a KeyboardHotkeysProvider',
		);
	}

	return context;
}

/**
 * Normalize a set of keys into a stable combo
 * { shift, m, e } → "e+m+shift"
 */
function normalizeChord(keys: Set<string>): string {
	return Array.from(keys).sort().join('+');
}

/**
 * Normalize registration strings
 * "shift+m+e" → "e+m+shift"
 */
function normalizeComboString(combo: string): string {
	return normalizeChord(new Set(combo.split('+')));
}

export function KeyboardHotkeysProvider({
	children,
}: {
	children: JSX.Element;
}): JSX.Element {
	const { open: cmdKOpen } = useCmdK();
	const shortcuts = useRef<Record<string, () => void>>({});
	const pressedKeys = useRef<Set<string>>(new Set());

	// A detected valid shortcut waiting to fire
	const pendingCombo = useRef<string | null>(null);

	// Tracks whether user extended the combo
	const wasExtended = useRef(false);

	const handleKeyDown = (event: KeyboardEvent): void => {
		if (event.repeat) return;

		const target = event.target as HTMLElement;
		const isCodeMirrorEditor =
			(target as HTMLElement).closest('.cm-editor') !== null;
		if (
			IGNORE_INPUTS.includes((target as HTMLElement).tagName.toLowerCase()) ||
			isCodeMirrorEditor
		) {
			return;
		}

		const key = event.key?.toLowerCase();
		if (!key) return; // Skip if key is undefined

		// If a pending combo exists and a new key is pressed → extension
		if (pendingCombo.current && !pressedKeys.current.has(key)) {
			wasExtended.current = true;
		}

		pressedKeys.current.add(key);

		if (event.shiftKey) pressedKeys.current.add('shift');
		if (event.metaKey || event.ctrlKey) pressedKeys.current.add('meta');
		if (event.altKey) pressedKeys.current.add('alt');

		const combo = normalizeChord(pressedKeys.current);

		if (shortcuts.current[combo]) {
			event.preventDefault();
			event.stopPropagation();
			pendingCombo.current = combo;
			wasExtended.current = false;
		}
	};

	const handleKeyUp = (event: KeyboardEvent): void => {
		const key = event.key?.toLowerCase();
		if (!key) return; // Skip if key is undefined

		pressedKeys.current.delete(key);

		if (!event.shiftKey) pressedKeys.current.delete('shift');
		if (!event.metaKey && !event.ctrlKey) pressedKeys.current.delete('meta');
		if (!event.altKey) pressedKeys.current.delete('alt');

		if (!pendingCombo.current) return;

		// Fire only if user did NOT extend the combo
		if (!wasExtended.current) {
			event.preventDefault();
			try {
				shortcuts.current[pendingCombo.current]?.();
			} catch (error) {
				console.error('Error executing hotkey callback:', error);
			}
		}

		pendingCombo.current = null;
		wasExtended.current = false;
	};

	useEffect((): (() => void) => {
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('keyup', handleKeyUp);

		const reset = (): void => {
			pressedKeys.current.clear();
			pendingCombo.current = null;
			wasExtended.current = false;
		};

		window.addEventListener('blur', reset);

		return (): void => {
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('blur', reset);
		};
	}, []);

	useEffect(() => {
		if (!cmdKOpen) {
			// Reset when palette closes
			pressedKeys.current.clear();
			pendingCombo.current = null;
			wasExtended.current = false;
		}
	}, [cmdKOpen]);

	const registerShortcut = useCallback(
		(keyCombo: string, callback: () => void): void => {
			const normalized = normalizeComboString(keyCombo);

			if (!shortcuts.current[normalized]) {
				shortcuts.current[normalized] = callback;
				return;
			}

			const message = `This shortcut is already present in current scope :- ${keyCombo}`;

			if (process.env.NODE_ENV === 'development') {
				throw new Error(message);
			} else {
				console.error(message);
			}
		},
		[],
	);

	const deregisterShortcut = useCallback((keyCombo: string) => {
		const normalized = normalizeComboString(keyCombo);
		unset(shortcuts.current, normalized);
	}, []);

	const ctxValue = useMemo(
		() => ({
			registerShortcut,
			deregisterShortcut,
		}),
		[registerShortcut, deregisterShortcut],
	);

	return (
		<KeyboardHotkeysContext.Provider value={ctxValue}>
			{children}
		</KeyboardHotkeysContext.Provider>
	);
}
