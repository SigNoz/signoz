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
		const el = inputRef.current?.input;
		if (!el) {
			setIsOverflowing(false);
			return;
		}
		setIsOverflowing(el.scrollWidth > el.clientWidth);
	}, [value, disabled]);

	useEffect(() => {
		const input = inputRef.current?.input;
		const mirror = mirrorRef.current;
		if (!input || !mirror) return;

		// mirror text content
		mirror.textContent = String(value ?? '') || ' ';

		// measure + clamp
		const mirrorWidth = mirror.offsetWidth + 24;
		const newWidth = Math.min(maxAutoWidth, Math.max(minAutoWidth, mirrorWidth));
		input.style.width = `${newWidth}px`;
	}, [value, minAutoWidth, maxAutoWidth]);

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
