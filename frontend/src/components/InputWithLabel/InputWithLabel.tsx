import './InputWithLabel.styles.scss';

import { Button, Input, Typography } from 'antd';
import cx from 'classnames';
import { X } from 'lucide-react';
import { useState } from 'react';

function InputWithLabel({
	label,
	initialValue,
	placeholder,
	type,
	onClose,
	labelAfter,
}: {
	label: string;
	initialValue?: string | number;
	placeholder: string;
	type?: string;
	onClose?: () => void;
	labelAfter?: boolean;
}): JSX.Element {
	const [inputValue, setInputValue] = useState<string>(
		initialValue ? initialValue.toString() : '',
	);

	return (
		<div
			className={cx('input-with-label', {
				labelAfter,
			})}
		>
			{!labelAfter && <Typography.Text className="label">{label}</Typography.Text>}
			<Input
				className="input"
				placeholder={placeholder}
				type={type}
				value={inputValue}
				onChange={(e): void => setInputValue(e.target.value)}
			/>
			{labelAfter && <Typography.Text className="label">{label}</Typography.Text>}
			{onClose && (
				<Button
					className="periscope-btn ghost close-btn"
					icon={<X size={16} />}
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
};

export default InputWithLabel;
