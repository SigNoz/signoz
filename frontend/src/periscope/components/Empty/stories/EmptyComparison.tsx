import { Button } from '@signozhq/ui/button';
import { Empty as AntdEmpty } from 'antd';

import Empty from '../Empty';
import styles from './EmptyComparison.module.scss';

export const ANTD_EMPTY_TEST_ID = 'empty-antd';
export const LOCAL_EMPTY_TEST_ID = 'empty-local';

export type EmptyComparisonImage = 'default' | 'simple';

export interface EmptyComparisonProps {
	image: EmptyComparisonImage;
	/** Unset shows antd's default text; set, it ends with a link. */
	description?: string;
	hideDescription: boolean;
	withFooter: boolean;
}

/** Renders antd's `Empty` and ours with the same props, side by side. */
function EmptyComparison({
	image,
	description,
	hideDescription,
	withFooter,
}: EmptyComparisonProps): JSX.Element {
	const customDescription = description ? (
		<>
			{description} <a href="#empty-description">Learn more</a>
		</>
	) : undefined;
	const resolvedDescription = hideDescription ? false : customDescription;
	const footer = withFooter ? (
		<>
			<Button size="md" variant="solid" color="primary">
				Create
			</Button>
			<a href="#empty-footer">Docs</a>
		</>
	) : null;

	return (
		<div className={styles.comparison}>
			<div className={styles.panel}>
				<span className={styles.label}>antd</span>
				<div className={styles.frame}>
					<AntdEmpty
						data-testid={ANTD_EMPTY_TEST_ID}
						image={
							image === 'simple'
								? AntdEmpty.PRESENTED_IMAGE_SIMPLE
								: AntdEmpty.PRESENTED_IMAGE_DEFAULT
						}
						description={resolvedDescription}
					>
						{footer}
					</AntdEmpty>
				</div>
			</div>
			<div className={styles.panel}>
				<span className={styles.label}>periscope</span>
				<div className={styles.frame}>
					<Empty
						data-testid={LOCAL_EMPTY_TEST_ID}
						image={
							image === 'simple'
								? Empty.PRESENTED_IMAGE_SIMPLE
								: Empty.PRESENTED_IMAGE_DEFAULT
						}
						description={resolvedDescription}
					>
						{footer}
					</Empty>
				</div>
			</div>
		</div>
	);
}

export default EmptyComparison;
