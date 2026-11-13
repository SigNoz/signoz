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
					<Typography
						variant="paragraph"
						size="medium"
						weight="bold"
						color="inherit"
						as="h5"
						marginY={4}
						textOverflow="wrap"
					>
						{hasQueryResult
							? 'No data'
							: 'Select a metric and run a query to see the results'}
					</Typography>
				}
			/>
		</div>
	);
}
