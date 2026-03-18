import { cloneElement, isValidElement, ReactElement } from 'react';

import { LegacyCellResult, OrderedColumn } from './types';

export const getColumnId = (column: OrderedColumn): string =>
	String(column.key);

export const resolveLegacyCellContent = (
	rendered: LegacyCellResult,
): ReactElement | string | number | null => {
	if (
		rendered &&
		typeof rendered === 'object' &&
		'children' in rendered &&
		isValidElement(rendered.children)
	) {
		const { children, props } = rendered as {
			children: ReactElement;
			props?: Record<string, unknown>;
		};
		return cloneElement(children, props || {});
	}
	if (rendered && typeof rendered === 'object' && isValidElement(rendered)) {
		return rendered;
	}
	return typeof rendered === 'string' || typeof rendered === 'number'
		? rendered
		: null;
};
