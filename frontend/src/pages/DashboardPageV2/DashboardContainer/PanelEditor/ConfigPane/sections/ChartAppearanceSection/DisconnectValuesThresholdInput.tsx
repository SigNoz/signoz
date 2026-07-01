import { type ChangeEvent, useEffect, useState } from 'react';
import { rangeUtil } from '@grafana/data';
import { Callout } from '@signozhq/ui/callout';
import { Input } from 'antd';

import styles from './ChartAppearanceSection.module.scss';

interface DisconnectValuesThresholdInputProps {
	testId: string;
	/** Current threshold as a duration string (e.g. "1m") — the stored wire value. */
	value: string;
	/** Smallest allowed threshold (the query step interval), in seconds. */
	minValue?: number;
	onChange: (duration: string) => void;
}

/**
 * Duration input for the span-gaps threshold: shows/accepts and reports a human
 * duration ("30s", "1m", "1h"), which is the value stored verbatim in
 * `fillLessThan` (a bare number is read as seconds). It is only parsed to seconds
 * to validate against the query step interval. Invalid entries, or values below
 * that floor, surface an inline error and are not committed (V1 parity).
 */
function DisconnectValuesThresholdInput({
	testId,
	value,
	minValue,
	onChange,
}: DisconnectValuesThresholdInputProps): JSX.Element {
	const [text, setText] = useState(value);
	const [error, setError] = useState<string | null>(null);

	// Resync the displayed duration when the committed value changes upstream.
	useEffect(() => {
		setText(value);
		setError(null);
	}, [value]);

	const commit = (raw: string): void => {
		if (!raw) {
			return;
		}
		let seconds: number;
		try {
			seconds = rangeUtil.isValidTimeSpan(raw)
				? rangeUtil.intervalToSeconds(raw)
				: NaN;
		} catch {
			seconds = NaN;
		}
		if (!Number.isFinite(seconds) || seconds <= 0) {
			setError('Enter a valid duration (e.g. 30s, 1m, 1h)');
			return;
		}
		if (minValue !== undefined && seconds < minValue) {
			setError(`Threshold should be > ${rangeUtil.secondsToHms(minValue)}`);
			return;
		}
		setError(null);
		// Store the user's duration string as-is — the wire format the backend wants.
		onChange(raw);
	};

	return (
		<div className={styles.thresholdField}>
			<Input
				data-testid={testId}
				type="text"
				status={error ? 'error' : undefined}
				prefix={<span className={styles.thresholdPrefix}>&gt;</span>}
				value={text}
				onChange={(e: ChangeEvent<HTMLInputElement>): void => {
					setText(e.target.value);
					if (error) {
						setError(null);
					}
				}}
				onBlur={(e): void => commit(e.currentTarget.value)}
				onKeyDown={(e): void => {
					if (e.key === 'Enter') {
						commit(e.currentTarget.value);
					}
				}}
			/>
			{error && (
				<Callout type="error" size="small" showIcon>
					{error}
				</Callout>
			)}
		</div>
	);
}

export default DisconnectValuesThresholdInput;
