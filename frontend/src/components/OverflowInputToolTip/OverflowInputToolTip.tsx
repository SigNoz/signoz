/* eslint-disable react/require-default-props */
/* eslint-disable react/jsx-props-no-spreading */

import './OverflowInputToolTip.scss';

import { Input, InputProps, InputRef, Tooltip } from 'antd';
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react';

export interface OverflowTooltipInputProps extends InputProps {
	tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

const OverflowInputToolTip = forwardRef<InputRef, OverflowTooltipInputProps>(
	(
		{
			value,
			defaultValue,
			onChange,
			disabled = false,
			tooltipPlacement = 'top',
			style,
			...rest
		},
		ref,
	) => {
		const inputRef = useRef<InputRef>(null);
		const [isOverflowing, setIsOverflowing] = useState<boolean>(false);

		useImperativeHandle(ref, () => inputRef.current as InputRef, []);

		useEffect(() => {
			const el = inputRef.current?.input;
			if (!el) {
				setIsOverflowing(false);
				return;
			}
			setIsOverflowing(el.scrollWidth > el.clientWidth);
		}, [value, disabled]);

		const tooltipTitle = !disabled && isOverflowing ? String(value ?? '') : '';

		return (
			<Tooltip title={tooltipTitle} placement={tooltipPlacement}>
				{/* eslint-disable-next-line react/jsx-props-no-spreading */}
				<Input
					{...rest}
					value={value}
					defaultValue={defaultValue}
					onChange={onChange}
					disabled={disabled}
					ref={inputRef}
					className="overflow-input"
					style={style}
				/>
			</Tooltip>
		);
	},
);

OverflowInputToolTip.displayName = 'OverflowInputToolTip';

export default OverflowInputToolTip;
