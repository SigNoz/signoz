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
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'center',
				borderRight: 'solid 1px #ddd',
			}}
			size={{ width, height: 60 }}
			enable={{
				top: false,
				right: true,
				bottom: false,
				left: false,
				topRight: false,
				bottomRight: false,
				bottomLeft: false,
				topLeft: false,
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
