import { Row as AntdRow } from 'antd';
import cx from 'classnames';

import Row from '../Row';
import type { RowProps } from '../types';
import styles from './RowComparison.module.scss';

export const ANTD_ROW_TEST_ID = 'row-antd';
export const LOCAL_ROW_TEST_ID = 'row-local';

const ITEM_SIZES = [styles.itemSmall, styles.itemLarge, styles.itemMedium];

export interface RowComparisonProps extends Pick<
	RowProps,
	'gutter' | 'justify' | 'align' | 'wrap'
> {
	itemCount: number;
}

/** Renders antd's `Row` and ours with the same props, side by side. */
function RowComparison({
	itemCount,
	...rowProps
}: RowComparisonProps): JSX.Element {
	const items = Array.from({ length: itemCount }, (_, index) => (
		<div
			// Items are positional fixtures with no identity of their own.
			// eslint-disable-next-line react/no-array-index-key
			key={index}
			className={cx(styles.item, ITEM_SIZES[index % ITEM_SIZES.length])}
		/>
	));
	if (itemCount > 0) {
		items.push(
			<span key="text">text</span>,
			<a key="link" href="#row">
				link
			</a>,
		);
	}

	return (
		<div className={styles.comparison}>
			<div className={styles.panel}>
				<span className={styles.label}>antd</span>
				<div className={styles.frame}>
					<AntdRow data-testid={ANTD_ROW_TEST_ID} {...rowProps}>
						{items}
					</AntdRow>
				</div>
			</div>
			<div className={styles.panel}>
				<span className={styles.label}>periscope</span>
				<div className={styles.frame}>
					<Row data-testid={LOCAL_ROW_TEST_ID} {...rowProps}>
						{items}
					</Row>
				</div>
			</div>
		</div>
	);
}

export default RowComparison;
