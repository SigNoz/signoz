import { NumberSize, Resizable } from 're-resizable';
import { Direction } from 're-resizable/lib/resizer';
import React from 'react';

function ResizableHeader(props: ResizableHeaderProps): JSX.Element {
	const { onResize, width, ...restProps } = props;

	if (!width) {
		// eslint-disable-next-line react/jsx-props-no-spreading
		return <th {...restProps} />;
	}

	return (
		<Resizable
			size={{ width, height: '100%' }}
			as="th"
			enable={{
				right: true,
				left: false,
			}}
			onResize={onResize}
		>
			{/* eslint-disable-next-line react/jsx-props-no-spreading */}
			<th {...restProps} />
		</Resizable>
	);
}

interface ResizableHeaderProps {
	onResize: (
		event: MouseEvent | TouchEvent,
		direction: Direction,
		elementRef: HTMLElement,
		delta: NumberSize,
	) => void;
	width: number;
}

export default ResizableHeader;
