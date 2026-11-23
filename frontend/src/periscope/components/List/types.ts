import type {
	HTMLAttributes,
	Key,
	ReactElement,
	ReactNode,
	RefAttributes,
} from 'react';

export type ListSize = 'small' | 'default' | 'large';

export type ListItemLayout = 'horizontal' | 'vertical';

export interface ListLocale {
	/** A falsy value falls back to the default empty state. */
	emptyText?: ReactNode;
}

export interface ListProps<T> extends HTMLAttributes<HTMLDivElement> {
	dataSource?: T[];
	renderItem?: (item: T, index: number) => ReactNode;
	/** Defaults to `item.key`, then `list-item-${index}`. */
	rowKey?: ((item: T) => Key) | keyof T;
	header?: ReactNode;
	footer?: ReactNode;
	bordered?: boolean;
	size?: ListSize;
	split?: boolean;
	itemLayout?: ListItemLayout;
	locale?: ListLocale;
}

export interface ListItemProps extends HTMLAttributes<HTMLLIElement> {
	actions?: ReactNode[];
	extra?: ReactNode;
}

export interface ListItemMetaProps extends Omit<
	HTMLAttributes<HTMLDivElement>,
	'title'
> {
	avatar?: ReactNode;
	title?: ReactNode;
	description?: ReactNode;
}

export interface ListContextValue {
	itemLayout?: ListItemLayout;
}

export type ListComponent = (<T>(
	props: ListProps<T> & RefAttributes<HTMLDivElement>,
) => ReactElement | null) & { displayName?: string };
