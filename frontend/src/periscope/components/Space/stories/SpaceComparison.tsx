import type { ReactNode } from 'react';
import { Space as AntdSpace } from 'antd';
import cx from 'classnames';

import Space from '../Space';
import type { SpaceProps } from '../types';
import styles from './SpaceComparison.module.scss';

export const ANTD_SPACE_TEST_ID = 'space-antd';
export const LOCAL_SPACE_TEST_ID = 'space-local';

const ITEM_SIZES = [styles.itemSmall, styles.itemLarge, styles.itemMedium];

export interface SpaceComparisonProps extends Pick<
	SpaceProps,
	'size' | 'direction' | 'align' | 'wrap' | 'split'
> {
	itemCount: number;
	/** Interleaves `null` and a child that renders nothing. */
	withEmptyChildren?: boolean;
	/** Renders `Space.Compact` instead, which takes only `direction`. */
	compact?: boolean;
	block?: boolean;
}

function RendersNothing(): null {
	return null;
}

/** Renders antd's `Space` and ours with the same props, side by side. */
function SpaceComparison({
	itemCount,
	withEmptyChildren = false,
	compact = false,
	block,
	...spaceProps
}: SpaceComparisonProps): JSX.Element {
	const items: ReactNode[] = Array.from({ length: itemCount }, (_, index) => (
		<div
			// Items are positional fixtures with no identity of their own.
			// eslint-disable-next-line react/no-array-index-key
			key={index}
			className={cx(styles.item, ITEM_SIZES[index % ITEM_SIZES.length])}
		>
			{index + 1}
		</div>
	));
	const children = withEmptyChildren
		? items.flatMap((item, index) => [
				null,
				item,
				// eslint-disable-next-line react/no-array-index-key
				index === 0 ? <RendersNothing key={`empty-${index}`} /> : undefined,
			])
		: items;

	return (
		<div className={styles.comparison}>
			<div className={styles.panel}>
				<span className={styles.label}>antd</span>
				<div className={styles.frame}>
					{compact ? (
						<AntdSpace.Compact
							data-testid={ANTD_SPACE_TEST_ID}
							direction={spaceProps.direction}
							block={block}
						>
							{children}
						</AntdSpace.Compact>
					) : (
						<AntdSpace data-testid={ANTD_SPACE_TEST_ID} {...spaceProps}>
							{children}
						</AntdSpace>
					)}
				</div>
			</div>
			<div className={styles.panel}>
				<span className={styles.label}>periscope</span>
				<div className={styles.frame}>
					{compact ? (
						<Space.Compact
							data-testid={LOCAL_SPACE_TEST_ID}
							direction={spaceProps.direction}
							block={block}
						>
							{children}
						</Space.Compact>
					) : (
						<Space data-testid={LOCAL_SPACE_TEST_ID} {...spaceProps}>
							{children}
						</Space>
					)}
				</div>
			</div>
		</div>
	);
}

export default SpaceComparison;
