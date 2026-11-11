import cx from 'classnames';

import styles from './List.module.scss';
import type { ListItemMetaProps } from './types';

function ListItemMeta({
	className,
	avatar,
	title,
	description,
	children: _children,
	...rest
}: ListItemMetaProps): JSX.Element {
	return (
		<div className={cx(styles.itemMeta, className)} {...rest}>
			{avatar && <div className={styles.itemMetaAvatar}>{avatar}</div>}
			{(title || description) && (
				<div className={styles.itemMetaContent}>
					{title && <h4 className={styles.itemMetaTitle}>{title}</h4>}
					{description && (
						<div className={styles.itemMetaDescription}>{description}</div>
					)}
				</div>
			)}
		</div>
	);
}

export default ListItemMeta;
