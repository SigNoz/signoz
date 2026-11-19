import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef, Fragment, useMemo } from 'react';
import Empty from 'periscope/components/Empty/Empty';

import styles from './List.module.scss';
import ListContext from './ListContext';
import ListItem from './ListItem';
import type { ListComponent, ListProps } from './types';
import { getListClassName, getRowKey } from './utils';

function InternalList<T>(
	{
		bordered = false,
		split = true,
		className,
		children,
		itemLayout,
		dataSource = [],
		size,
		header,
		footer,
		rowKey,
		renderItem,
		locale,
		...rest
	}: ListProps<T>,
	ref: ForwardedRef<HTMLDivElement>,
): JSX.Element {
	const contextValue = useMemo(() => ({ itemLayout }), [itemLayout]);

	let content: ReactNode = null;
	if (dataSource.length > 0) {
		content = (
			<ul className={styles.items}>
				{dataSource.map((item, index) => (
					<Fragment key={getRowKey(item, index, rowKey)}>
						{renderItem ? renderItem(item, index) : null}
					</Fragment>
				))}
			</ul>
		);
	} else if (!children) {
		content = (
			<div className={styles.emptyText}>
				{locale?.emptyText || <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
			</div>
		);
	}

	return (
		<ListContext.Provider value={contextValue}>
			<div
				ref={ref}
				className={getListClassName({
					className,
					itemLayout,
					size,
					split,
					bordered,
					hasFooter: !!footer,
				})}
				{...rest}
			>
				{header && <div className={styles.header}>{header}</div>}
				<div className={styles.nestedLoading}>
					<div className={styles.container}>
						{content}
						{children}
					</div>
				</div>
				{footer && <div className={styles.footer}>{footer}</div>}
			</div>
		</ListContext.Provider>
	);
}

/** Drop-in replacement for antd's `List` (5.11). */
const List = Object.assign(forwardRef(InternalList) as ListComponent, {
	Item: ListItem,
});

export default List;
