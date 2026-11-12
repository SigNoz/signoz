import { Flex as AntdFlex } from 'antd';
import cx from 'classnames';

import Flex from '../Flex';
import type { FlexProps } from '../types';
import styles from './FlexComparison.module.scss';

export const ANTD_FLEX_TEST_ID = 'flex-antd';
export const LOCAL_FLEX_TEST_ID = 'flex-local';

const ITEM_SIZES = [styles.itemSmall, styles.itemLarge, styles.itemMedium];

export interface FlexComparisonProps extends Pick<
	FlexProps,
	'vertical' | 'wrap' | 'justify' | 'align' | 'gap' | 'flex'
> {
	itemCount: number;
}

/** Renders antd's `Flex` and ours with the same props, side by side. */
function FlexComparison({
	itemCount,
	...flexProps
}: FlexComparisonProps): JSX.Element {
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
			<a key="link" href="#flex">
				link
			</a>,
		);
	}

	return (
		<div className={styles.comparison}>
			<div className={styles.panel}>
				<span className={styles.label}>antd</span>
				<div className={styles.frame}>
					<AntdFlex data-testid={ANTD_FLEX_TEST_ID} {...flexProps}>
						{items}
					</AntdFlex>
				</div>
			</div>
			<div className={styles.panel}>
				<span className={styles.label}>periscope</span>
				<div className={styles.frame}>
					<Flex data-testid={LOCAL_FLEX_TEST_ID} {...flexProps}>
						{items}
					</Flex>
				</div>
			</div>
		</div>
	);
}

export default FlexComparison;
