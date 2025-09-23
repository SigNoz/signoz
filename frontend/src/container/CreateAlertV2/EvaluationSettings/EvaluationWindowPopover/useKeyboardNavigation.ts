import React, { useCallback, useEffect, useRef } from 'react';

interface UseKeyboardNavigationOptions {
	onSelect?: (value: string, sectionId: string) => void;
	onEscape?: () => void;
}

export const useKeyboardNavigationForEvaluationWindowPopover = ({
	onSelect,
	onEscape,
}: UseKeyboardNavigationOptions = {}): {
	containerRef: React.RefObject<HTMLDivElement>;
	firstItemRef: React.RefObject<HTMLDivElement>;
} => {
	const containerRef = useRef<HTMLDivElement>(null);
	const firstItemRef = useRef<HTMLDivElement>(null);

	const getFocusableItems = useCallback((): HTMLElement[] => {
		if (!containerRef.current) return [];

		return Array.from(
			containerRef.current.querySelectorAll(
				'.evaluation-window-content-list-item[tabindex="0"]',
			),
		) as HTMLElement[];
	}, []);

	const getInteractiveElements = useCallback((): HTMLElement[] => {
		if (!containerRef.current) return [];

		const detailsSection = containerRef.current.querySelector(
			'.evaluation-window-details',
		);
		if (!detailsSection) return [];

		return Array.from(
			detailsSection.querySelectorAll(
				'input, select, button, [tabindex="0"], [tabindex="-1"]',
			),
		) as HTMLElement[];
	}, []);

	const getCurrentIndex = useCallback((items: HTMLElement[]): number => {
		const activeElement = document.activeElement as HTMLElement;
		return items.findIndex((item) => item === activeElement);
	}, []);

	const navigateWithinSection = useCallback(
		(direction: 'up' | 'down'): void => {
			const items = getFocusableItems();
			if (items.length === 0) return;

			const currentIndex = getCurrentIndex(items);
			let nextIndex: number;
			if (direction === 'down') {
				nextIndex = (currentIndex + 1) % items.length;
			} else {
				nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
			}

			items[nextIndex]?.focus();
		},
		[getFocusableItems, getCurrentIndex],
	);

	const navigateToDetails = useCallback((): void => {
		const interactiveElements = getInteractiveElements();
		interactiveElements[0]?.focus();
	}, [getInteractiveElements]);

	const navigateBackToSection = useCallback((): void => {
		const items = getFocusableItems();
		items[0]?.focus();
	}, [getFocusableItems]);

	const navigateBetweenSections = useCallback(
		(direction: 'left' | 'right'): void => {
			const activeElement = document.activeElement as HTMLElement;
			const isInDetails = activeElement?.closest('.evaluation-window-details');

			if (isInDetails && direction === 'left') {
				navigateBackToSection();
				return;
			}

			const items = getFocusableItems();
			if (items.length === 0) return;

			const currentIndex = getCurrentIndex(items);
			const DATA_ATTR = 'data-section-id';
			const currentSectionId = items[currentIndex]?.getAttribute(DATA_ATTR);

			if (currentSectionId === 'window-type' && direction === 'right') {
				const timeframeItem = items.find(
					(item) => item.getAttribute(DATA_ATTR) === 'timeframe',
				);
				timeframeItem?.focus();
			} else if (currentSectionId === 'timeframe' && direction === 'left') {
				const windowTypeItem = items.find(
					(item) => item.getAttribute(DATA_ATTR) === 'window-type',
				);
				windowTypeItem?.focus();
			} else if (currentSectionId === 'timeframe' && direction === 'right') {
				navigateToDetails();
			}
		},
		[
			navigateBackToSection,
			navigateToDetails,
			getFocusableItems,
			getCurrentIndex,
		],
	);

	const handleSelection = useCallback((): void => {
		const activeElement = document.activeElement as HTMLElement;
		if (!activeElement || !onSelect) return;

		const value = activeElement.getAttribute('data-value');
		const sectionId = activeElement.getAttribute('data-section-id');

		if (value && sectionId) {
			onSelect(value, sectionId);
		}
	}, [onSelect]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent): void => {
			switch (event.key) {
				case 'ArrowDown':
					event.preventDefault();
					navigateWithinSection('down');
					break;
				case 'ArrowUp':
					event.preventDefault();
					navigateWithinSection('up');
					break;
				case 'ArrowLeft':
					event.preventDefault();
					navigateBetweenSections('left');
					break;
				case 'ArrowRight':
					event.preventDefault();
					navigateBetweenSections('right');
					break;
				case 'Enter':
				case ' ':
					event.preventDefault();
					handleSelection();
					break;
				case 'Escape':
					event.preventDefault();
					onEscape?.();
					break;
				default:
					break;
			}
		},
		[navigateWithinSection, navigateBetweenSections, handleSelection, onEscape],
	);

	useEffect((): (() => void) | undefined => {
		const container = containerRef.current;
		if (!container) return undefined;

		container.addEventListener('keydown', handleKeyDown);
		return (): void => container.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown]);

	useEffect((): void => {
		if (firstItemRef.current) {
			firstItemRef.current.focus();
		}
	}, []);

	return {
		containerRef: containerRef as React.RefObject<HTMLDivElement>,
		firstItemRef: firstItemRef as React.RefObject<HTMLDivElement>,
	};
};
