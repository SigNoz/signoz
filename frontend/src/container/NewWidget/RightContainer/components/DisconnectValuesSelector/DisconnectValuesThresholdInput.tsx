import { ChangeEvent, useEffect, useState } from 'react';
import { rangeUtil } from '@grafana/data';
import { Callout } from '@signozhq/ui/callout';
import { Input } from '@signozhq/ui/input';
interface DisconnectValuesThresholdInputProps {
	value: number;
	onChange: (seconds: number) => void;
	minValue: number;
}

export default function DisconnectValuesThresholdInput({
	value,
	onChange,
	minValue,
}: DisconnectValuesThresholdInputProps): JSX.Element {
	const [inputValue, setInputValue] = useState<string>(
		rangeUtil.secondsToHms(value),
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setInputValue(rangeUtil.secondsToHms(value));
		setError(null);
	}, [value]);

	const updateValue = (txt: string): void => {
		if (!txt) {
			return;
		}
		try {
			let seconds: number;
			if (rangeUtil.isValidTimeSpan(txt)) {
				seconds = rangeUtil.intervalToSeconds(txt);
			} else {
				const parsed = Number(txt);
				if (Number.isNaN(parsed) || parsed <= 0) {
					setError('Enter a valid duration (e.g. 1h, 10m, 1d)');
					return;
				}
				seconds = parsed;
			}
			if (minValue !== undefined && seconds < minValue) {
				setError(`Threshold should be > ${rangeUtil.secondsToHms(minValue)}`);
				return;
			}
			setError(null);
			setInputValue(txt);
			onChange(seconds);
		} catch {
			setError('Invalid threshold value');
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter') {
			updateValue(e.currentTarget.value);
		}
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
		updateValue(e.currentTarget.value);
	};

	const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
		setInputValue(e.currentTarget.value);
		if (error) {
			setError(null);
		}
	};

	return (
		<div className="disconnect-values-threshold-wrapper">
			<Input
				name="disconnect-values-threshold"
				type="text"
				className="disconnect-values-threshold-input"
				prefix={<span className="disconnect-values-threshold-prefix">&gt;</span>}
				value={inputValue}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				autoFocus={true}
				aria-invalid={!!error}
				aria-describedby={error ? 'threshold-error' : undefined}
			/>
			{error && (
				<Callout type="error" size="small" showIcon>
					{error}
				</Callout>
			)}
		</div>
	);
}
