import { Select } from '@signozhq/ui/select';
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
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="main"
					as="span"
					textOverflow="wrap"
				>
					Default time range
				</Typography>
				<Select
					width="100%"
					placeholder="Select a time range"
					testId="dashboard-default-time-range"
					items={buildDefaultTimeRangeItems(value)}
					value={value && value !== '30m' ? value : DEFAULT_TIME_RANGE_UNSET}
					onChange={(next: string): void =>
						onChange(next === DEFAULT_TIME_RANGE_UNSET ? '' : next)
					}
				/>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					Applies by default when a viewer opens the dashboard for the first time.
				</Typography>
			</div>
		</div>
	);
}

export default DefaultTimeRange;
