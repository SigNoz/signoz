import type { Key, ReactNode } from 'react';
import { Children } from 'react';
import cx from 'classnames';

import styles from './List.module.scss';
import type { ListItemLayout, ListProps, ListSize } from './types';

const SIZE_CLASS: Record<ListSize, string | undefined> = {
	small: styles.sm,
	default: undefined,
	large: styles.lg,
};

type ListClassNameInput = Pick<
	ListProps<unknown>,
	'className' | 'itemLayout' | 'size' | 'split' | 'bordered'
> & { hasFooter: boolean };

export function getListClassName({
	className,
	itemLayout,
	size,
	split,
	bordered,
	hasFooter,
}: ListClassNameInput): string {
	return cx(
		styles.list,
		itemLayout === 'vertical' && styles.vertical,
		size && SIZE_CLASS[size],
		split && styles.split,
		bordered && styles.bordered,
		hasFooter && styles.somethingAfterLastItem,
		className,
	);
}

export function getRowKey<T>(
	item: T,
	index: number,
	rowKey: ListProps<T>['rowKey'],
): Key {
	let key: unknown;
	if (typeof rowKey === 'function') {
		key = rowKey(item);
	} else if (rowKey) {
		key = item[rowKey];
	} else {
		key = (item as { key?: unknown } | null | undefined)?.key;
	}
	return key ? (key as Key) : `list-item-${index}`;
}

function hasTextAmongSiblings(children: ReactNode): boolean {
	let hasText = false;
	Children.forEach(children, (child) => {
		if (typeof child === 'string') {
			hasText = true;
		}
	});
	return hasText && Children.count(children) > 1;
}

/** Mirrors antd: a vertical item is flex only with `extra`; a horizontal one unless text sits beside other children. */
export function isItemFlexMode(
	children: ReactNode,
	itemLayout: ListItemLayout | undefined,
	extra: ReactNode,
): boolean {
	if (itemLayout === 'vertical') {
		return !!extra;
	}
	return !hasTextAmongSiblings(children);
}
