import { useMemo } from 'react';
import { Col as AntdCol, Row as AntdRow } from 'antd';

import RowContext, { type RowContextState } from '../../Row/RowContext';
import Col from '../Col';
import type { ColProps } from '../types';
import styles from './ColComparison.module.scss';

export const ANTD_ROW_TEST_ID = 'col-antd-row';
export const LOCAL_ROW_TEST_ID = 'col-local-row';
export const ANTD_COL_TEST_ID = 'col-antd';
export const LOCAL_COL_TEST_ID = 'col-local';

export interface ColComparisonProps extends Pick<
	ColProps,
	| 'span'
	| 'order'
	| 'offset'
	| 'push'
	| 'pull'
	| 'flex'
	| 'xs'
	| 'sm'
	| 'md'
	| 'lg'
	| 'xl'
	| 'xxl'
> {
	gutterX: number;
	gutterY: number;
	wrap?: boolean;
	/** Span of each sibling column; `0` leaves them unsized. */
	siblingSpan: number;
	siblingCount: number;
}

/**
 * Renders antd's `Col` and ours with the same props, side by side. Both sit in
 * an antd `Row`; ours reads the same gutter and wrap from our `RowContext`.
 */
function ColComparison({
	gutterX,
	gutterY,
	wrap,
	siblingSpan,
	siblingCount,
	...colProps
}: ColComparisonProps): JSX.Element {
	const rowContext = useMemo(
		(): RowContextState => ({ gutter: [gutterX, gutterY], wrap }),
		[gutterX, gutterY, wrap],
	);
	const siblingSpanProp = siblingSpan > 0 ? siblingSpan : undefined;
	const siblingKeys = Array.from(
		{ length: siblingCount },
		(_, index) => `sibling-${index}`,
	);

	return (
		<div className={styles.comparison}>
			<div className={styles.panel}>
				<span className={styles.label}>antd</span>
				<div className={styles.frame}>
					<AntdRow
						data-testid={ANTD_ROW_TEST_ID}
						gutter={[gutterX, gutterY]}
						wrap={wrap}
					>
						<AntdCol data-testid={ANTD_COL_TEST_ID} {...colProps}>
							<div className={styles.subject}>col</div>
						</AntdCol>
						{siblingKeys.map((key) => (
							<AntdCol key={key} span={siblingSpanProp}>
								<div className={styles.sibling}>sibling</div>
							</AntdCol>
						))}
					</AntdRow>
				</div>
			</div>
			<div className={styles.panel}>
				<span className={styles.label}>periscope</span>
				<div className={styles.frame}>
					<AntdRow
						data-testid={LOCAL_ROW_TEST_ID}
						gutter={[gutterX, gutterY]}
						wrap={wrap}
					>
						<RowContext.Provider value={rowContext}>
							<Col data-testid={LOCAL_COL_TEST_ID} {...colProps}>
								<div className={styles.subject}>col</div>
							</Col>
							{siblingKeys.map((key) => (
								<Col key={key} span={siblingSpanProp}>
									<div className={styles.sibling}>sibling</div>
								</Col>
							))}
						</RowContext.Provider>
					</AntdRow>
				</div>
			</div>
		</div>
	);
}

export default ColComparison;
