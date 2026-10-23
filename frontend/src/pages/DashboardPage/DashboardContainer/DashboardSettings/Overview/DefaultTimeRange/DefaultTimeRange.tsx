import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';

import { buildDefaultTimeRangeItems, DEFAULT_TIME_RANGE_UNSET } from '../utils';
import settingsStyles from '../../DashboardSettings.module.scss';
import styles from './DefaultTimeRange.module.scss';

interface DefaultTimeRangeProps {
	value: string;
	onChange: (value: string) => void;
}

function DefaultTimeRange({
	value,
	onChange,
}: DefaultTimeRangeProps): JSX.Element {
	return (
		<div className={settingsStyles.settingsCard}>
			<div className={styles.infoItemContainer}>
				<Typography className={styles.infoTitle}>Default time range</Typography>
				<section className={styles.defaultTimeRangeInput}>
					<SelectSimple
						className={styles.defaultTimeRangeSelect}
						testId="dashboard-default-time-range"
						items={buildDefaultTimeRangeItems(value)}
						value={value && value !== '30m' ? value : DEFAULT_TIME_RANGE_UNSET}
						withPortal={false}
						onChange={(value): void =>
							onChange(value === DEFAULT_TIME_RANGE_UNSET ? '' : (value as string))
						}
					/>
				</section>
				<Typography className={styles.infoHint}>
					Applies when a viewer opens the dashboard without a time range in the URL
					and has not picked one before.
				</Typography>
			</div>
		</div>
	);
}

export default DefaultTimeRange;
