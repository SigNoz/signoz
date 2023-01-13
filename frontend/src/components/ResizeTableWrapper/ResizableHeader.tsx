/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { Resizable, ResizeCallbackData } from 'react-resizable';

// # Styles import
import { SpanStyle } from './styles';

function ResizableHeader(
	props: React.HTMLAttributes<any> & {
		onResize: (
			e: React.SyntheticEvent<Element>,
			data: ResizeCallbackData,
		) => void;
		width: number;
	},
): JSX.Element {
	const { onResize, width, ...restProps } = props;
	if (!width) {
		return <th {...restProps} />;
	}
	return (
		<Resizable
			width={width}
			height={0}
			handle={
				<SpanStyle
					className="react-resizable-handle"
					onClick={(e): void => e.stopPropagation()}
				/>
			}
			onResize={onResize}
			draggableOpts={{ enableUserSelectHack: false }}
		>
			<th {...restProps} />
		</Resizable>
	);
}

export default ResizableHeader;
