import { useEffect } from 'react';

const IGNORED_TARGETS = [
	'[data-log-detail-ignore="true"]',
	'.cm-tooltip-autocomplete',
	'.drawer-popover',
	'.query-status-popover',
	'[data-radix-popper-content-wrapper]',
	'[data-base-ui-portal]',
].join(',');

export function useCloseOnOutsideClick(
	enabled: boolean,
	onClose: () => void,
): void {
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}

		const handleMouseDown = (e: MouseEvent): void => {
			if (e.target instanceof Element && e.target.closest(IGNORED_TARGETS)) {
				return;
			}
			onClose();
		};

		document.addEventListener('mousedown', handleMouseDown);
		return (): void => {
			document.removeEventListener('mousedown', handleMouseDown);
		};
	}, [enabled, onClose]);
}
