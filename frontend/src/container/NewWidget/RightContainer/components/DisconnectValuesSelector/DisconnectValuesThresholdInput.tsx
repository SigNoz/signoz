import { useEffect, useState } from 'react';
import { rangeUtil } from '@grafana/data';
import { Input } from '@signozhq/ui';
interface DisconnectValuesThresholdInputProps {
	value: number;
	onChange: (seconds: number) => void;
}

export default function DisconnectValuesThresholdInput({
	value,
	onChange,
}: DisconnectValuesThresholdInputProps): JSX.Element {
	const [inputValue, setInputValue] = useState<string>(
		rangeUtil.secondsToHms(value),
	);

	useEffect(() => {
		setInputValue(rangeUtil.secondsToHms(value));
	}, [value]);

	const commitValue = (txt: string): void => {
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
					return;
				}
				seconds = parsed;
			}
			setInputValue(txt);
			onChange(seconds);
		} catch (err) {
			console.warn('Invalid threshold value', err);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter') {
			commitValue(e.currentTarget.value);
		}
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
		commitValue(e.currentTarget.value);
	};

	return (
		<Input
			name="disconnect-values-threshold"
			className="disconnect-values-threshold-input"
			prefix={<span className="disconnect-values-threshold-prefix">&gt;</span>}
			value={inputValue}
			onChange={(e): void => setInputValue(e.currentTarget.value)}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
			autoFocus={false}
		/>
	);
}
