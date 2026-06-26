import { useEffect, useState } from 'react';
import { rangeUtil } from '@grafana/data';
import { Typography } from '@signozhq/ui/typography';
import type { DashboardtypesSpanGapsDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';
import DisconnectValuesThresholdInput from './DisconnectValuesThresholdInput';

import styles from './ChartAppearanceSection.module.scss';

const DEFAULT_THRESHOLD = '1m';
const MODE_NEVER = 'never';
const MODE_THRESHOLD = 'threshold';
const MODE_OPTIONS = [
	{ value: MODE_NEVER, label: 'Never' },
	{ value: MODE_THRESHOLD, label: 'Threshold' },
];

interface DisconnectValuesFieldProps {
	testId: string;
	value: DashboardtypesSpanGapsDTO | undefined;
	/** Query step interval (seconds): seeds the default threshold and floors it. */
	stepInterval?: number;
	onChange: (next: DashboardtypesSpanGapsDTO | undefined) => void;
}

/** Default threshold duration: the step interval (smallest meaningful), else 1m. */
function defaultDuration(stepInterval?: number): string {
	return stepInterval && stepInterval > 0
		? rangeUtil.secondsToHms(stepInterval)
		: DEFAULT_THRESHOLD;
}

/**
 * "Disconnect values": Never (span every gap — the chart default) vs Threshold
 * (only bridge gaps shorter than a duration). The threshold persists as a
 * duration string in `spanGaps.fillLessThan` ("10m", "5s") — the wire format the
 * backend expects.
 */
function DisconnectValuesField({
	testId,
	value,
	stepInterval,
	onChange,
}: DisconnectValuesFieldProps): JSX.Element {
	const duration = value?.fillLessThan || undefined;
	const isThreshold = !!duration;
	// Remember the last threshold so toggling Never → Threshold restores it.
	const [lastDuration, setLastDuration] = useState(
		duration ?? defaultDuration(stepInterval),
	);

	useEffect(() => {
		if (duration) {
			setLastDuration(duration);
		}
	}, [duration]);

	const handleMode = (mode: string): void => {
		onChange(
			mode === MODE_THRESHOLD
				? { ...value, fillLessThan: lastDuration }
				: undefined,
		);
	};

	return (
		<>
			<div className={styles.field}>
				<Typography.Text>Disconnect values</Typography.Text>
				<ConfigSegmented
					testId={testId}
					value={isThreshold ? MODE_THRESHOLD : MODE_NEVER}
					items={MODE_OPTIONS}
					onChange={handleMode}
				/>
			</div>
			{isThreshold && (
				<div className={styles.field}>
					<Typography.Text>Threshold value</Typography.Text>
					<DisconnectValuesThresholdInput
						testId={`${testId}-value`}
						value={lastDuration}
						minValue={stepInterval}
						onChange={(next): void => onChange({ ...value, fillLessThan: next })}
					/>
				</div>
			)}
		</>
	);
}

export default DisconnectValuesField;
