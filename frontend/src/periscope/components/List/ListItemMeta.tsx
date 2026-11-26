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
			{avatar && (
				<div data-testid="list-item-meta-avatar" className={styles.itemMetaAvatar}>
					{avatar}
				</div>
			)}
			{(title || description) && (
				<div
					data-testid="list-item-meta-content"
					className={styles.itemMetaContent}
				>
					{title && <h4 className={styles.itemMetaTitle}>{title}</h4>}
					{description && (
						<div
							data-testid="list-item-meta-description"
							className={styles.itemMetaDescription}
						>
							{description}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default ListItemMeta;
