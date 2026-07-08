/*
 * jsx-a11y/control-has-associated-label mis-fires on non-interactive data-table
 * cells whose content is a wrapping element rather than a direct text node — a
 * placeholder `<td>` is not a control.
 */
/* eslint-disable jsx-a11y/control-has-associated-label */
import { Skeleton } from 'antd';
import cx from 'classnames';

// The loading twin of MapperRow: same cells, same classes (it deliberately
// shares MapperRow's stylesheet), with a per-column placeholder (target ·
// sources · writes-to · status) so the lazy per-group load mirrors real rows
// rather than flat bars. Plain <tr> (not motion) on purpose: once the mappers
// arrive we want the skeleton replaced instantly, with no fade
// cross-dissolving against the incoming rows. antd's `active` shimmer covers
// the loading feel on its own.
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
