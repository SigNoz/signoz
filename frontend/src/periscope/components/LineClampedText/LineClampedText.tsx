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
			className="line-clamped-wrapper__text"
			style={{
				WebkitLineClamp: lines,
			}}
		>
			{text}
		</div>
	);

	return isOverflowing ? (
		<Tooltip
			// eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
			title={<div onClick={(e): void => e.stopPropagation()}>{text}</div>}
			overlayClassName="line-clamped-wrapper"
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
