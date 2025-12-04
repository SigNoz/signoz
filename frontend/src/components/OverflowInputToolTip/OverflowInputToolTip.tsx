/* eslint-disable react/require-default-props */
/* eslint-disable react/jsx-props-no-spreading */

import './OverflowInputToolTip.scss';

import { Input, InputProps, InputRef, Tooltip } from 'antd';
import cx from 'classnames';
import { useEffect, useRef, useState } from 'react';

export interface OverflowTooltipInputProps extends InputProps {
	tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
	minAutoWidth?: number;
	maxAutoWidth?: number;
}

function OverflowInputToolTip({
	value,
	defaultValue,
	onChange,
	disabled = false,
	tooltipPlacement = 'top',
	className,
	minAutoWidth = 70,
	maxAutoWidth = 150,
	...rest
}: OverflowTooltipInputProps): JSX.Element {
	const inputRef = useRef<InputRef>(null);
	const mirrorRef = useRef<HTMLSpanElement | null>(null);
	const [isOverflowing, setIsOverflowing] = useState<boolean>(false);

	useEffect(() => {
		const input = inputRef.current?.input;
		const mirror = mirrorRef.current;
		if (!input || !mirror) {
			setIsOverflowing(false);
			return;
		}

		mirror.textContent = String(value ?? '') || ' ';
		const mirrorWidth = mirror.offsetWidth + 24;
		const newWidth = Math.min(maxAutoWidth, Math.max(minAutoWidth, mirrorWidth));
		input.style.width = `${newWidth}px`;

		// consider clamped when mirrorWidth reaches maxAutoWidth (allow -5px tolerance)
		const isClamped = mirrorWidth >= maxAutoWidth - 5;
		const overflow = input.scrollWidth > input.clientWidth && isClamped;

		setIsOverflowing(overflow);
	}, [value, disabled, minAutoWidth, maxAutoWidth]);

	const tooltipTitle = !disabled && isOverflowing ? String(value ?? '') : '';

	return (
		<>
			<span ref={mirrorRef} aria-hidden className="overflow-input-mirror" />
			<Tooltip title={tooltipTitle} placement={tooltipPlacement}>
				<Input
					{...rest}
					value={value}
					defaultValue={defaultValue}
					onChange={onChange}
					disabled={disabled}
					ref={inputRef}
					className={cx('overflow-input', className)}
				/>
			</Tooltip>
		</>
	);
}

OverflowInputToolTip.displayName = 'OverflowInputToolTip';

export default OverflowInputToolTip;
