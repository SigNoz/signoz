import './GridCardLayout.styles.scss';

import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { useCallback, useEffect, useRef } from 'react';

interface ClickToShowButtonProps {
	graphRef: React.RefObject<HTMLDivElement>;
	onClickHandler?: OnClickPluginOpts['onClick'];
	buttonText?: string;
	buttonClassName?: string;
	isButtonEnabled?: boolean;
}

interface ButtonPosition {
	left: number;
	top: number;
}

export const useGraphClickToShowButton = ({
	graphRef,
	onClickHandler,
	buttonText = 'View Explorer',
	buttonClassName = 'view-onclick-show-button',
	isButtonEnabled = true,
}: ClickToShowButtonProps): OnClickPluginOpts['onClick'] => {
	const activeButtonRef = useRef<HTMLButtonElement | null>(null);

	const hideTooltips = (): void => {
		const elements = [
			{ id: 'overlay', selector: '#overlay' },
			{ className: 'uplot-tooltip', selector: '.uplot-tooltip' },
		];

		elements.forEach(({ selector }) => {
			const element = document.querySelector(selector) as HTMLElement;
			if (element) {
				element.style.display = 'none';
			}
		});
	};

	const calculateButtonPosition = (
		mouseX: number,
		mouseY: number,
		buttonElement: HTMLButtonElement,
		graphBounds: DOMRect,
	): ButtonPosition => {
		let left = mouseX - buttonElement.getBoundingClientRect().width - 10;
		let top = mouseY - 10;
		const buttonBounds = buttonElement.getBoundingClientRect();

		// Adjust position to keep button within graph boundaries
		if (left < 0) {
			left = mouseX + 10;
		}
		if (top + buttonBounds.height > graphBounds.height) {
			top = mouseY - buttonBounds.height - 10;
		}

		return {
			left: Math.max(10, left),
			top: Math.max(10, top),
		};
	};

	const cleanup = useCallback((): void => {
		if (activeButtonRef.current) {
			activeButtonRef.current.remove();
			activeButtonRef.current = null;
		}

		// Restore tooltips
		['#overlay', '.uplot-tooltip'].forEach((selector) => {
			const element = document.querySelector(selector) as HTMLElement;
			if (element) {
				element.style.display = 'block';
			}
		});
	}, []);

	const createButton = (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
		metric: { [key: string]: string },
	): void => {
		const newButton = document.createElement('button');
		newButton.textContent = buttonText;
		newButton.className = buttonClassName;
		newButton.style.position = 'absolute';
		newButton.style.visibility = 'hidden';
		newButton.style.zIndex = '9999';

		const graphBounds = graphRef.current?.getBoundingClientRect();
		if (!graphBounds) return;

		graphRef.current?.appendChild(newButton);

		const { left, top } = calculateButtonPosition(
			mouseX,
			mouseY,
			newButton,
			graphBounds,
		);

		newButton.style.left = `${left}px`;
		newButton.style.top = `${top}px`;
		newButton.style.visibility = 'visible';

		newButton.onclick = (e: MouseEvent): void => {
			e.stopPropagation();
			onClickHandler?.(xValue, yValue, mouseX, mouseY, metric);
			cleanup();
		};

		activeButtonRef.current = newButton;
	};

	useEffect(() => {
		const handleOutsideClick = (e: MouseEvent): void => {
			if (!graphRef.current?.contains(e.target as Node)) {
				cleanup();
			}
		};

		document.addEventListener('click', handleOutsideClick);
		return (): void => {
			document.removeEventListener('click', handleOutsideClick);
			cleanup();
		};
	}, [cleanup, graphRef]);

	return useCallback(
		(xValue, yValue, mouseX, mouseY, metric) => {
			cleanup();

			if (isButtonEnabled && xValue && metric && Object.keys(metric).length > 0) {
				hideTooltips();
				createButton(xValue, yValue, mouseX, mouseY, metric);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			buttonText,
			buttonClassName,
			graphRef,
			onClickHandler,
			isButtonEnabled,
			cleanup,
		],
	);
};
