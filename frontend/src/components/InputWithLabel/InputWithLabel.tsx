import { useState } from 'react';
import { Input } from '@signozhq/ui/input';
import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { X } from '@signozhq/icons';

import './InputWithLabel.styles.scss';

function InputWithLabel({
	label,
	initialValue,
	placeholder,
	type,
	onClose,
	labelAfter,
	onChange,
	className,
	closeIcon,
	disabled,
	sanitize,
}: {
	label: string;
	initialValue?: string | number | null;
	placeholder: string;
	type?: string;
	onClose?: () => void;
	labelAfter?: boolean;
	onChange: (value: string) => void;
	className?: string;
	closeIcon?: React.ReactNode;
	disabled?: boolean;
	/** Rewrites the typed value before it is shown and reported. */
	sanitize?: (value: string) => string;
}): JSX.Element {
	const [inputValue, setInputValue] = useState<string>(
		initialValue ? initialValue.toString() : '',
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const value = sanitize ? sanitize(e.target.value) : e.target.value;
		setInputValue(value);
		onChange?.(value);
	};

	return (
		<div
			className={cx('input-with-label', className, {
				labelAfter,
			})}
		>
			{!labelAfter && <Typography.Text className="label">{label}</Typography.Text>}
			<div
				className={cx('input', {
					'input__has-label-after': !labelAfter,
					'input__has-close-button': !!onClose,
				})}
			>
				<Input
					placeholder={placeholder}
					type={type}
					value={inputValue}
					onChange={handleChange}
					disabled={disabled}
					disabledTooltip={undefined}
					name={label.toLowerCase()}
					testId={`input-${label}`}
				/>
			</div>
			{labelAfter && <Typography.Text className="label">{label}</Typography.Text>}
			{onClose && (
				<Button
					className="periscope-btn ghost close-btn"
					icon={closeIcon || <X size={16} />}
					onClick={onClose}
				/>
			)}
		</div>
	);
}

InputWithLabel.defaultProps = {
	type: 'text',
	onClose: undefined,
	labelAfter: false,
	initialValue: undefined,
	className: undefined,
	closeIcon: undefined,
	sanitize: undefined,
};

export default InputWithLabel;
