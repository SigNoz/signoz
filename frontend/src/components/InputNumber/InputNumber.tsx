import {
	ChangeEvent,
	CSSProperties,
	FocusEvent,
	FocusEventHandler,
	forwardRef,
	KeyboardEventHandler,
	ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Input } from '@signozhq/ui/input';
import cx from 'classnames';

export type InputNumberProps = {
	value?: number | null;
	defaultValue?: number | null;
	onChange?: (value: number | null) => void;
	min?: number;
	max?: number;
	step?: number;
	/**
	 * Number of decimal places to display and round to on blur. Mirrors antd
	 * InputNumber's `precision`: while focused the user can type freely, and on
	 * blur the value is rounded and rendered with trailing zeros (e.g.
	 * precision=2 → "1.50").
	 */
	precision?: number;
	placeholder?: string;
	disabled?: boolean;
	prefix?: ReactNode;
	suffix?: ReactNode;
	className?: string;
	rootClassName?: string;
	style?: CSSProperties;
	id?: string;
	name?: string;
	testId?: string;
	autoFocus?: boolean;
	onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
	onBlur?: FocusEventHandler<HTMLInputElement>;
	onFocus?: FocusEventHandler<HTMLInputElement>;
	'aria-label'?: string;
	'data-testid'?: string;
};

// Permits the in-progress shapes a user types while building a number:
// "", "-", "1", "1.", "1.5", ".5", "-1.5"
const NUMERIC_TOKEN_REGEX = /^-?(\d+\.?\d*|\.\d*)?$/;

const formatForDisplay = (
	value: number | null | undefined,
	precision?: number,
): string => {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return '';
	}
	if (precision === undefined) {
		return String(value);
	}
	return value.toFixed(precision);
};

const parseRaw = (raw: string): number | null => {
	if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
		return null;
	}
	const parsed = Number(raw);
	return Number.isNaN(parsed) ? null : parsed;
};

const clamp = (value: number, min?: number, max?: number): number => {
	let next = value;
	if (min !== undefined && next < min) {
		next = min;
	}
	if (max !== undefined && next > max) {
		next = max;
	}
	return next;
};

const InputNumber = forwardRef<HTMLInputElement, InputNumberProps>(
	(
		{
			value,
			defaultValue,
			onChange,
			min,
			max,
			step,
			precision,
			placeholder,
			disabled,
			prefix,
			suffix,
			className,
			rootClassName,
			style,
			id,
			name,
			testId,
			autoFocus,
			onKeyDown,
			onBlur,
			onFocus,
			'aria-label': ariaLabel,
			'data-testid': dataTestId,
		},
		ref,
	): JSX.Element => {
		const isControlled = value !== undefined;
		const isFocusedRef = useRef(false);
		const [displayValue, setDisplayValue] = useState<string>(() =>
			formatForDisplay(isControlled ? value : defaultValue, precision),
		);

		// Sync display from the controlled value when the user isn't actively
		// typing, so external state changes (and precision changes) propagate.
		useEffect(() => {
			if (!isControlled || isFocusedRef.current) {
				return;
			}
			setDisplayValue(formatForDisplay(value, precision));
		}, [isControlled, value, precision]);

		const handleChange = useCallback(
			(event: ChangeEvent<HTMLInputElement>): void => {
				const raw = event.target.value;
				if (raw !== '' && !NUMERIC_TOKEN_REGEX.test(raw)) {
					return;
				}
				setDisplayValue(raw);
				onChange?.(parseRaw(raw));
			},
			[onChange],
		);

		const handleFocus = useCallback(
			(event: FocusEvent<HTMLInputElement>): void => {
				isFocusedRef.current = true;
				onFocus?.(event);
			},
			[onFocus],
		);

		const handleBlur = useCallback(
			(event: FocusEvent<HTMLInputElement>): void => {
				isFocusedRef.current = false;
				const parsed = parseRaw(displayValue);
				if (parsed === null) {
					if (displayValue !== '') {
						setDisplayValue('');
						onChange?.(null);
					}
				} else {
					const clamped = clamp(parsed, min, max);
					const finalValue =
						precision === undefined
							? clamped
							: Math.round(clamped * 10 ** precision) / 10 ** precision;
					const nextDisplay = formatForDisplay(finalValue, precision);
					if (nextDisplay !== displayValue) {
						setDisplayValue(nextDisplay);
					}
					if (finalValue !== parsed) {
						onChange?.(finalValue);
					}
				}
				onBlur?.(event);
			},
			[displayValue, min, max, precision, onChange, onBlur],
		);

		return (
			<Input
				ref={ref}
				type="text"
				inputMode="decimal"
				value={displayValue}
				onChange={handleChange}
				onFocus={handleFocus}
				onBlur={handleBlur}
				min={min}
				max={max}
				step={step}
				placeholder={placeholder}
				disabled={disabled}
				prefix={prefix}
				suffix={suffix}
				className={cx('signoz-input-number', className)}
				containerClassName={cx('signoz-input-number-container', rootClassName)}
				style={style}
				id={id}
				name={name}
				testId={testId ?? dataTestId}
				autoFocus={autoFocus}
				onKeyDown={onKeyDown}
				aria-label={ariaLabel}
			/>
		);
	},
);

InputNumber.displayName = 'InputNumber';

export default InputNumber;
