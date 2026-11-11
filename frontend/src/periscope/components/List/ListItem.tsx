// eslint-disable-next-line no-restricted-imports -- mirrors antd's component-scoped ListContext, not shared state
import { forwardRef, useContext } from 'react';
import cx from 'classnames';

import styles from './List.module.scss';
import ListContext from './ListContext';
import ListItemActions from './ListItemActions';
import ListItemMeta from './ListItemMeta';
import type { ListItemProps } from './types';
import { isItemFlexMode } from './utils';

const InternalListItem = forwardRef<HTMLLIElement, ListItemProps>(
	function ListItem({ children, actions, extra, className, ...rest }, ref) {
		const { itemLayout } = useContext(ListContext);
		const actionList = actions && actions.length > 0 && (
			<ListItemActions actions={actions} />
		);

		return (
			<li
				ref={ref}
				className={cx(
					styles.item,
					!isItemFlexMode(children, itemLayout, extra) && styles.itemNoFlex,
					className,
				)}
				{...rest}
			>
				{itemLayout === 'vertical' && extra ? (
					<>
						<div className={styles.itemMain}>
							{children}
							{actionList}
						</div>
						<div className={styles.itemExtra}>{extra}</div>
					</>
				) : (
					<>
						{children}
						{actionList}
						{extra}
					</>
				)}
			</li>
		);
	},
);

const ListItem = Object.assign(InternalListItem, { Meta: ListItemMeta });

export default ListItem;
