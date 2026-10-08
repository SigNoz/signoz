import { useRef } from 'react';
import styles from './TimeInput.module.scss';

interface TimeInputProps {
	hour: string;
	minute: string;
	second: string;
	onHourChange: (v: string) => void;
	onMinuteChange: (v: string) => void;
	onSecondChange: (v: string) => void;
	/** When provided, renders the localized date as a static prefix inside the wrapper */
	date?: Date;
	label?: string;
	testIdPrefix?: string;
}

function TimeInput({
	hour,
	minute,
	second,
	onHourChange,
	onMinuteChange,
	onSecondChange,
	date,
	label,
	testIdPrefix = '',
}: TimeInputProps): JSX.Element {
	const hourRef = useRef<HTMLInputElement>(null);
	const minuteRef = useRef<HTMLInputElement>(null);
	const secondRef = useRef<HTMLInputElement>(null);
	const refs = [hourRef, minuteRef, secondRef];

	const tid = (name: string): string =>
		testIdPrefix ? `${testIdPrefix}-${name}` : name;

	const focusSegment = (index: number): void => {
		const ref = refs[index];
		if (ref?.current) {
			ref.current.focus();
			ref.current.select();
		}
	};

	const handleChange = (
		rawValue: string,
		onChange: (v: string) => void,
		index: number,
		maxLead: number,
	): void => {
		const digits = rawValue.replace(/\D/g, '').slice(0, 2);
		onChange(digits);

		if (
			digits.length === 2 ||
			(digits.length === 1 && parseInt(digits, 10) > maxLead)
		) {
			focusSegment(index + 1);
		}
	};

	const handleKeyDown = (
		e: React.KeyboardEvent<HTMLInputElement>,
		value: string,
		index: number,
	): void => {
		const input = e.currentTarget;

		if (e.key === 'ArrowRight') {
			if (input.selectionStart === input.value.length) {
				e.preventDefault();
				focusSegment(index + 1);
			}
		} else if (e.key === 'ArrowLeft') {
			if (input.selectionStart === 0) {
				e.preventDefault();
				focusSegment(index - 1);
			}
		} else if (e.key === 'Backspace' && value === '') {
			e.preventDefault();
			focusSegment(index - 1);
		}
	};

	const handleFocus = (e: React.FocusEvent<HTMLInputElement>): void => {
		e.target.select();
	};

	const handleBlur = (
		e: React.FocusEvent<HTMLInputElement>,
		onChange: (v: string) => void,
		max: number,
	): void => {
		const value = e.currentTarget.value;
		if (value === '') {
			return;
		}
		const n = Math.min(Math.max(parseInt(value, 10), 0), max);
		onChange(String(n).padStart(2, '0'));
	};

	return (
		<div className={styles.timeInput}>
			{label && <span className={styles.timeLabel}>{label}</span>}
			<div className={styles.wrapper}>
				{date && (
					<span className={styles.datePrefix} aria-hidden="true">
						{date.toLocaleDateString()}
					</span>
				)}
				<input
					ref={hourRef}
					className={styles.segment}
					type="text"
					inputMode="numeric"
					value={hour}
					placeholder="HH"
					maxLength={2}
					aria-label="Hours"
					data-testid={tid('time-input-hour')}
					onChange={(e): void => handleChange(e.target.value, onHourChange, 0, 2)}
					onKeyDown={(e): void => handleKeyDown(e, hour, 0)}
					onFocus={handleFocus}
					onBlur={(e): void => handleBlur(e, onHourChange, 23)}
				/>
				<span className={styles.sep} aria-hidden="true">
					h
				</span>
				<input
					ref={minuteRef}
					className={styles.segment}
					type="text"
					inputMode="numeric"
					value={minute}
					placeholder="MM"
					maxLength={2}
					aria-label="Minutes"
					data-testid={tid('time-input-minute')}
					onChange={(e): void => handleChange(e.target.value, onMinuteChange, 1, 5)}
					onKeyDown={(e): void => handleKeyDown(e, minute, 1)}
					onFocus={handleFocus}
					onBlur={(e): void => handleBlur(e, onMinuteChange, 59)}
				/>
				<span className={styles.sep} aria-hidden="true">
					m
				</span>
				<input
					ref={secondRef}
					className={styles.segment}
					type="text"
					inputMode="numeric"
					value={second}
					placeholder="SS"
					maxLength={2}
					aria-label="Seconds"
					data-testid={tid('time-input-second')}
					onChange={(e): void => handleChange(e.target.value, onSecondChange, 2, 5)}
					onKeyDown={(e): void => handleKeyDown(e, second, 2)}
					onFocus={handleFocus}
					onBlur={(e): void => handleBlur(e, onSecondChange, 59)}
				/>
				<span className={styles.sep} aria-hidden="true">
					s
				</span>
			</div>
		</div>
	);
}

export default TimeInput;
