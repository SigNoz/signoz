import { useEffect } from 'react';

const IGNORED_TARGET =
	'input, textarea, [contenteditable="true"], .cm-editor, [role="menu"], [role="listbox"]';

type UseArrowKeyNavigationParams = {
	enabled: boolean;
	onPrev: () => void;
	onNext: () => void;
};

export function useArrowKeyNavigation({
	enabled,
	onPrev,
	onNext,
}: UseArrowKeyNavigationParams): void {
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}

		const handleKeyDown = (e: KeyboardEvent): void => {
			if (e.defaultPrevented) {
				return;
			}
			if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
				return;
			}
			if (e.target instanceof Element && e.target.closest(IGNORED_TARGET)) {
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				onPrev();
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				onNext();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return (): void => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [enabled, onPrev, onNext]);
}
