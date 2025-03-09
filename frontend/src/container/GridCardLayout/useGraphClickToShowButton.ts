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
}: ClickToShowButtonProps): ((
	xValue: number,
	yValue: number,
	mouseX: number,
	mouseY: number,
	metric?: { [key: string]: string },
	queryData?: { queryName: string; inFocusOrNot: boolean },
	menuItems?: Array<{
		text: string;
		onClick: (
			xValue: number,
			yValue: number,
			mouseX: number,
			mouseY: number,
			metric?: { [key: string]: string },
			queryData?: { queryName: string; inFocusOrNot: boolean },
		) => void;
	}>,
) => void) => {
	const activeButtonRef = useRef<HTMLButtonElement | HTMLUListElement | null>(
		null,
	);

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

	// const createButton = (
	// 	xValue: number,
	// 	yValue: number,
	// 	mouseX: number,
	// 	mouseY: number,
	// 	metric?: {
	// 		[key: string]: string;
	// 	},
	// 	queryData?: {
	// 		queryName: string;
	// 		inFocusOrNot: boolean;
	// 	},
	// ): void => {
	// 	const newButton = document.createElement('button');
	// 	newButton.textContent = buttonText;
	// 	newButton.className = buttonClassName;
	// 	newButton.style.position = 'absolute';
	// 	newButton.style.zIndex = '9999';

	// 	const graphBounds = graphRef.current?.getBoundingClientRect();
	// 	if (!graphBounds) return;

	// 	const left = mouseX;
	// 	const top = mouseY;

	// 	// Add the button to the graph container
	// 	graphRef.current?.appendChild(newButton);

	// 	// Apply position after adding to DOM
	// 	const buttonBounds = newButton.getBoundingClientRect();

	// 	// Ensure button stays within graph boundaries
	// 	const finalLeft = Math.min(
	// 		Math.max(0, left),
	// 		graphBounds.width - buttonBounds.width,
	// 	);
	// 	const finalTop = Math.min(
	// 		Math.max(0, top),
	// 		graphBounds.height - buttonBounds.height,
	// 	);

	// 	newButton.style.left = `${finalLeft}px`;
	// 	newButton.style.top = `${finalTop}px`;

	// 	newButton.onclick = (e: MouseEvent): void => {
	// 		e.stopPropagation();
	// 		onClickHandler?.(xValue, yValue, mouseX, mouseY, metric, queryData);
	// 		cleanup();
	// 	};

	// 	activeButtonRef.current = newButton;
	// };

	const createMenu = (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
		menuItems: Array<{
			text: string;
			onClick: (
				xValue: number,
				yValue: number,
				mouseX: number,
				mouseY: number,
				metric?: { [key: string]: string },
				queryData?: { queryName: string; inFocusOrNot: boolean },
			) => void;
		}>,
		metric?: { [key: string]: string },
		queryData?: { queryName: string; inFocusOrNot: boolean },
	): void => {
		const menuList = document.createElement('ul');
		menuList.className = buttonClassName;
		menuList.style.position = 'absolute';
		menuList.style.zIndex = '9999';

		const graphBounds = graphRef.current?.getBoundingClientRect();
		if (!graphBounds) return;

		graphRef.current?.appendChild(menuList);

		// After appending, get menu dimensions and adjust if needed so it stays within the graph boundaries
		const menuBounds = menuList.getBoundingClientRect();

		// Calculate position considering menu dimensions
		let finalLeft = mouseX;
		let finalTop = mouseY;

		// Adjust horizontal position if menu would overflow
		if (mouseX + menuBounds.width > graphBounds.width) {
			finalLeft = mouseX - menuBounds.width;
		}
		// Ensure menu doesn't go off the left edge
		finalLeft = Math.max(0, finalLeft);

		// Adjust vertical position if menu would overflow
		if (mouseY + menuBounds.height > graphBounds.height) {
			finalTop = mouseY - menuBounds.height;
		}
		// Ensure menu doesn't go off the top edge
		finalTop = Math.max(0, finalTop);

		menuList.style.left = `${finalLeft}px`;
		menuList.style.top = `${finalTop}px`;

		// Create a list item for each menu option provided in props
		menuItems.forEach((item) => {
			const listItem = document.createElement('li');
			listItem.textContent = item.text;
			listItem.className = 'menu-item';
			// Style the list item as needed (padding, cursor, etc.)
			listItem.onclick = (e: MouseEvent): void => {
				e.stopPropagation();
				// Execute the provided onClick handler for this menu item
				item.onClick(xValue, yValue, mouseX, mouseY, metric, queryData);
				cleanup();
			};
			menuList.appendChild(listItem);
		});

		activeButtonRef.current = menuList;
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
		(xValue, yValue, mouseX, mouseY, metric, queryData, menuItems) => {
			cleanup();

			if (
				isButtonEnabled &&
				!isUndefined(xValue) &&
				queryData &&
				queryData?.inFocusOrNot &&
				Object.keys(queryData).length > 0
			) {
				hideTooltips();
				// createButton(xValue, yValue, mouseX, mouseY, metric, queryData);
				createMenu(
					xValue,
					yValue,
					mouseX,
					mouseY,
					menuItems || [],
					metric,
					queryData,
				);
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
