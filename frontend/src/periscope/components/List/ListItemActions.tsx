import type { ReactNode } from 'react';

import styles from './List.module.scss';

interface ListItemActionsProps {
	actions: ReactNode[];
}

function ListItemActions({ actions }: ListItemActionsProps): JSX.Element {
	return (
		<ul className={styles.itemAction}>
			{actions.map((action, index) => (
				// Actions are positional, as in antd.
				// eslint-disable-next-line react/no-array-index-key
				<li key={index} className={styles.itemActionItem}>
					{action}
					{index !== actions.length - 1 && <em className={styles.itemActionSplit} />}
				</li>
			))}
		</ul>
	);
}

export default ListItemActions;
