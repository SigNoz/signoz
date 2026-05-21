import './InputNumber.styles.scss';

import {
	ChangeEvent,
	CSSProperties,
	FocusEventHandler,
	forwardRef,
	KeyboardEventHandler,
	ReactNode,
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
	/** When set, values emitted via onChange are rounded to this many decimals. */
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

const toInputValue = (value: number | null | undefined): string | undefined => {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return '';
	}
	return String(value);
};

const parseValue = (raw: string, precision?: number): number | null => {
	if (raw === '' || raw === '-') {
		return null;
	}
	const parsed = Number(raw);
	if (Number.isNaN(parsed)) {
		return null;
	}
	if (precision === undefined) {
		return parsed;
	}
	const factor = 10 ** precision;
	return Math.round(parsed * factor) / factor;
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
		const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
			onChange?.(parseValue(event.target.value, precision));
		};

		return (
			<Input
				ref={ref}
				type="number"
				value={value === undefined ? undefined : toInputValue(value)}
				defaultValue={
					defaultValue === undefined ? undefined : toInputValue(defaultValue)
				}
				onChange={handleChange}
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
				onBlur={onBlur}
				onFocus={onFocus}
				aria-label={ariaLabel}
			/>
		);
	},
);

InputNumber.displayName = 'InputNumber';

export default InputNumber;
