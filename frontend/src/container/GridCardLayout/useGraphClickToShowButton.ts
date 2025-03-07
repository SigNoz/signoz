import './GridCardLayout.styles.scss';

import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { isUndefined } from 'lodash-es';
import { useCallback, useEffect, useRef } from 'react';

interface ClickToShowButtonProps {
	graphRef: React.RefObject<HTMLDivElement>;
	onClickHandler?: OnClickPluginOpts['onClick'];
	buttonText?: string;
	buttonClassName?: string;
	isButtonEnabled?: boolean;
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
		metric: {
			[key: string]: string | boolean;
			queryName: string;
			inFocusOrNot: boolean;
		},
	): void => {
		const newButton = document.createElement('button');
		newButton.textContent = buttonText;
		newButton.className = buttonClassName;
		newButton.style.position = 'absolute';
		newButton.style.zIndex = '9999';

		const graphBounds = graphRef.current?.getBoundingClientRect();
		if (!graphBounds) return;

		const left = mouseX;
		const top = mouseY;

		// Add the button to the graph container
		graphRef.current?.appendChild(newButton);

		// Apply position after adding to DOM
		const buttonBounds = newButton.getBoundingClientRect();

		// Ensure button stays within graph boundaries
		const finalLeft = Math.min(
			Math.max(0, left),
			graphBounds.width - buttonBounds.width,
		);
		const finalTop = Math.min(
			Math.max(0, top),
			graphBounds.height - buttonBounds.height,
		);

		newButton.style.left = `${finalLeft}px`;
		newButton.style.top = `${finalTop}px`;

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

			if (
				isButtonEnabled &&
				!isUndefined(xValue) &&
				metric &&
				metric?.inFocusOrNot &&
				Object.keys(metric).length > 0
			) {
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
