import { Skeleton } from 'antd';
import cx from 'classnames';

import styles from './MapperRow.module.scss';

function MapperRowSkeleton(): JSX.Element {
	return (
		<tr className={styles.mapperRow}>
			<td className={cx(styles.cell, styles.targetCell)}>
				<Skeleton.Input active size="small" style={{ width: '55%' }} />
			</td>
			<td className={styles.cell}>
				<div className={styles.sources}>
					<Skeleton.Button active size="small" style={{ width: 88 }} />
					<Skeleton.Button active size="small" style={{ width: 56 }} />
				</div>
			</td>
			<td className={styles.cell}>
				<Skeleton.Button active size="small" style={{ width: 72 }} />
			</td>
			<td className={cx(styles.cell, styles.statusCell)}>
				<div className={styles.rowActions}>
					<Skeleton.Button active size="small" shape="round" />
				</div>
			</td>
		</tr>
	);
}

export default MapperRowSkeleton;
