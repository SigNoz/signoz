import styles from './Space.module.scss';
import type { SpaceItemProps } from './types';

function SpaceItem({
	children,
	split,
	showSplit,
}: SpaceItemProps): JSX.Element | null {
	if (children === null || children === undefined) {
		return null;
	}
	return (
		<>
			<div className={styles.item}>{children}</div>
			{showSplit && split && <span>{split}</span>}
		</>
	);
}

export default SpaceItem;
