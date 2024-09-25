import './LineClampedText.styles.scss';

import { Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';

function LineClampedText({
	text,
	lines,
}: {
	text: string;
	lines?: number;
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

	return isOverflowing ? <Tooltip title={text}>{content}</Tooltip> : content;
}

LineClampedText.defaultProps = {
	lines: 1,
};

export default LineClampedText;
