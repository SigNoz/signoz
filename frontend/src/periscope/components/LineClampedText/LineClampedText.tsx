import { useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipProps } from 'antd';
import { isBoolean } from 'lodash-es';

import './LineClampedText.styles.scss';

function LineClampedText({
	text,
	lines,
	tooltipProps,
}: {
	text: string | boolean;
	lines?: number;
	tooltipProps?: TooltipProps;
}): JSX.Element {
	const [isOverflowing, setIsOverflowing] = useState(false);
	const textRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const checkOverflow = (): void => {
			if (textRef.current) {
				setIsOverflowing(
					textRef.current.scrollHeight > textRef.current.clientHeight,
				);
			}
		};

		checkOverflow();
		window.addEventListener('resize', checkOverflow);

		return (): void => {
			window.removeEventListener('resize', checkOverflow);
		};
	}, [text, lines]);

	const content = (
		<div
			ref={textRef}
			className="line-clamped-wrapper__text"
			style={{
				WebkitLineClamp: lines,
			}}
		>
			{isBoolean(text) ? String(text) : text}
		</div>
	);

	return isOverflowing ? (
		<Tooltip
			title={<div onClick={(e): void => e.stopPropagation()}>{text}</div>}
			overlayClassName="line-clamped-wrapper"
			{...tooltipProps}
		>
			{content}
		</Tooltip>
	) : (
		content
	);
}

LineClampedText.defaultProps = {
	lines: 1,
	tooltipProps: {},
};

export default LineClampedText;
