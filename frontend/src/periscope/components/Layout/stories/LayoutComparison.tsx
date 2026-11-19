import { Layout as AntdLayout } from 'antd';

import Layout from '../Layout';
import styles from './LayoutComparison.module.scss';
import LayoutFixture from './LayoutFixture';
import type { LayoutFixtureOptions, LayoutParts } from './LayoutFixture';
import { ANTD_LAYOUT_TEST_ID, LOCAL_LAYOUT_TEST_ID } from './layoutTestIds';

const ANTD_PARTS: LayoutParts = {
	Layout: AntdLayout,
	Header: AntdLayout.Header,
	Content: AntdLayout.Content,
	Footer: AntdLayout.Footer,
};

const LOCAL_PARTS: LayoutParts = {
	Layout,
	Header: Layout.Header,
	Content: Layout.Content,
	Footer: Layout.Footer,
};

export type LayoutComparisonProps = LayoutFixtureOptions;

/** Renders antd's `Layout` and ours with the same props, side by side. */
function LayoutComparison(props: LayoutComparisonProps): JSX.Element {
	return (
		<div className={styles.comparison}>
			<div className={styles.panel}>
				<span className={styles.label}>antd</span>
				<div className={styles.frame}>
					<LayoutFixture
						parts={ANTD_PARTS}
						testIdPrefix={ANTD_LAYOUT_TEST_ID}
						{...props}
					/>
				</div>
			</div>
			<div className={styles.panel}>
				<span className={styles.label}>periscope</span>
				<div className={styles.frame}>
					<LayoutFixture
						parts={LOCAL_PARTS}
						testIdPrefix={LOCAL_LAYOUT_TEST_ID}
						{...props}
					/>
				</div>
			</div>
		</div>
	);
}

export default LayoutComparison;
