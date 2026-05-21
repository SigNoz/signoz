import { useState } from 'react';
import { Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Button } from '@signozhq/ui/button';
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
}): JSX.Element {
	const [inputValue, setInputValue] = useState<string>(
		initialValue ? initialValue.toString() : '',
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setInputValue(e.target.value);
		onChange?.(e.target.value);
	};

	return (
		<div
			className={cx('input-with-label', className, {
				labelAfter,
			})}
		>
			{!labelAfter && <Typography.Text className="label">{label}</Typography.Text>}
			<Input
				className="input"
				placeholder={placeholder}
				type={type}
				value={inputValue}
				onChange={handleChange}
				name={label.toLowerCase()}
				data-testid={`input-${label}`}
			/>
			{labelAfter && <Typography.Text className="label">{label}</Typography.Text>}
			{onClose && (
				<Button
					className="close-btn"
					onClick={onClose}
					variant="outlined"
					color="secondary"
					size="icon"
					prefix={(closeIcon as JSX.Element) || <X size={16} />}
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
};

export default InputWithLabel;
