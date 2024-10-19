import './LineClampedText.styles.scss';

import { Tooltip, TooltipProps } from 'antd';
import { useEffect, useRef, useState } from 'react';

function LineClampedText({
	text,
	lines,
	tooltipProps,
}: {
	text: string;
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
			className="line-clamped-text"
			style={{
				WebkitLineClamp: lines,
			}}
		>
			{text}
		</div>
	);

	return isOverflowing ? (
		<Tooltip
			title={text}
			// eslint-disable-next-line react/jsx-props-no-spreading
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
