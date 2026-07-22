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
 * Inline error for a raw duration, or `null` when valid and in range. The parse is
 * guarded: `isValidTimeSpan` passes some strings `intervalToSeconds` throws on (e.g. "5x").
 */
function validationError(raw: string, minValue?: number): string | null {
	let seconds: number;
	try {
		seconds = rangeUtil.isValidTimeSpan(raw)
			? rangeUtil.intervalToSeconds(raw)
			: NaN;
	} catch {
		seconds = NaN;
	}
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return 'Enter a valid duration (e.g. 30s, 1m, 1h)';
	}
	if (minValue !== undefined && seconds < minValue) {
		return `Threshold should be > ${rangeUtil.secondsToHms(minValue)}`;
	}
	return null;
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

	// Validate live so an invalid entry surfaces immediately, not only on blur.
	const handleText = (raw: string): void => {
		setText(raw);
		setError(raw ? validationError(raw, minValue) : null);
	};

	const commit = (raw: string): void => {
		// Skip no-op commits: blur fires when clicking the Never toggle, and re-emitting
		// the unchanged value there would race the toggle and snap back to Threshold.
		if (!raw || raw === value) {
			return;
		}
		const message = validationError(raw, minValue);
		if (message) {
			setError(message);
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
				onChange={(e: ChangeEvent<HTMLInputElement>): void =>
					handleText(e.target.value)
				}
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
