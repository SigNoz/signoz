import { Empty } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import styles from './EmptyMeterSearch.module.scss';

interface EmptyMeterSearchProps {
	hasQueryResult?: boolean;
}

export default function EmptyMeterSearch({
	hasQueryResult,
}: EmptyMeterSearchProps): JSX.Element {
	return (
		<div className={styles.emptyMeterSearch}>
			<Empty
				description={
					<Typography.Title level={5}>
						{hasQueryResult
							? 'No data'
							: 'Select a metric and run a query to see the results'}
					</Typography.Title>
				}
			/>
		</div>
	);
}
