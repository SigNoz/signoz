import { Checkbox } from '@signozhq/ui/checkbox';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';

import { TIME_RANGE_PRESETS_OPTIONS } from './constants';
import styles from './PublicDashboard.module.scss';

interface PublicDashboardSettingsFormProps {
	timeRangeEnabled: boolean;
	defaultTimeRange: string;
	disabled: boolean;
	onTimeRangeEnabledChange: (value: boolean) => void;
	onDefaultTimeRangeChange: (value: string) => void;
}

function PublicDashboardSettingsForm({
	timeRangeEnabled,
	defaultTimeRange,
	disabled,
	onTimeRangeEnabledChange,
	onDefaultTimeRangeChange,
}: PublicDashboardSettingsFormProps): JSX.Element {
	return (
		<>
			<Checkbox
				id="public-dashboard-enable-time-range"
				className={styles.checkbox}
				testId="public-dashboard-time-range-toggle"
				value={timeRangeEnabled}
				disabled={disabled}
				onChange={(checked): void => onTimeRangeEnabledChange(checked === true)}
			>
				Enable time range
			</Checkbox>

			<div className={styles.timeRangeSelectGroup}>
				<Typography.Text className={styles.timeRangeSelectLabel}>
					Default time range
				</Typography.Text>
				<SelectSimple
					className={styles.timeRangeSelect}
					testId="public-dashboard-default-time-range"
					placeholder="Select default time range"
					items={TIME_RANGE_PRESETS_OPTIONS}
					value={defaultTimeRange}
					disabled={disabled}
					onChange={(value): void => onDefaultTimeRangeChange(value as string)}
				/>
			</div>
		</>
	);
}

export default PublicDashboardSettingsForm;
