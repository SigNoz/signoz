import { Skeleton } from 'antd';
import cx from 'classnames';

import styles from './MapperRow.module.scss';

function MapperRowSkeleton(): JSX.Element {
	return (
		<tr className={styles.mapperRow}>
			<td className={cx(styles.skeletonCell, styles.targetCell)}>
				<Skeleton.Input active size="small" style={{ width: '55%' }} />
				<Skeleton.Button active size="small" style={{ width: 72 }} />
			</td>
			<td className={styles.skeletonCell}>
				<div className={styles.sources}>
					<Skeleton.Button active size="small" style={{ width: 88 }} />
					<Skeleton.Button active size="small" style={{ width: 56 }} />
				</div>
			</td>
			<td className={cx(styles.skeletonCell, styles.actionsCell)}>
				<div className={styles.rowActions}>
					<Skeleton.Button active size="small" shape="round" />
				</div>
			</td>
		</tr>
	);
}

export default MapperRowSkeleton;
