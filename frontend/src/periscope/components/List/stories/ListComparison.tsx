import { List as AntdList } from 'antd';

import List from '../List';
import type { ListProps } from '../types';
import styles from './ListComparison.module.scss';
import type { FixtureItem, FixtureOptions } from './listFixtures';
import {
	FIXTURE_ITEMS,
	getFixtureItemProps,
	getFixtureMetaProps,
} from './listFixtures';

export const ANTD_LIST_TEST_ID = 'list-antd';
export const LOCAL_LIST_TEST_ID = 'list-local';

export interface ListComparisonProps
	extends
		Pick<ListProps<FixtureItem>, 'bordered' | 'size' | 'split' | 'itemLayout'>,
		FixtureOptions {
	itemCount: number;
	header?: string;
	footer?: string;
	emptyText?: string;
	/** Set on the list root; antd's reset on the inner wrapper brings items back to 13px. */
	fontSize?: number;
}

/** Renders antd's `List` and ours with the same props, side by side. */
function ListComparison({
	itemCount,
	header,
	footer,
	emptyText,
	fontSize,
	avatar,
	description,
	actions,
	extra,
	...listProps
}: ListComparisonProps): JSX.Element {
	const options = { avatar, description, actions, extra };
	const sharedProps = {
		dataSource: FIXTURE_ITEMS.slice(0, itemCount),
		header,
		footer,
		locale: emptyText ? { emptyText } : undefined,
		style: fontSize ? { fontSize } : undefined,
		...listProps,
	};

	return (
		<div className={styles.comparison}>
			<div className={styles.panel}>
				<span className={styles.label}>antd</span>
				<AntdList
					data-testid={ANTD_LIST_TEST_ID}
					{...sharedProps}
					renderItem={(item): JSX.Element => (
						<AntdList.Item {...getFixtureItemProps(item, options)}>
							<AntdList.Item.Meta {...getFixtureMetaProps(item, options)} />
						</AntdList.Item>
					)}
				/>
			</div>
			<div className={styles.panel}>
				<span className={styles.label}>periscope</span>
				<List
					data-testid={LOCAL_LIST_TEST_ID}
					{...sharedProps}
					renderItem={(item): JSX.Element => (
						<List.Item {...getFixtureItemProps(item, options)}>
							<List.Item.Meta {...getFixtureMetaProps(item, options)} />
						</List.Item>
					)}
				/>
			</div>
		</div>
	);
}

export default ListComparison;
