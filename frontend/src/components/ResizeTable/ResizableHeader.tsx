import { SyntheticEvent, useMemo } from 'react';
import { Resizable, ResizeCallbackData } from 'react-resizable';

import { enableUserSelectHack } from './config';
import { SpanStyle } from './styles';

function ResizableHeader(props: ResizableHeaderProps): JSX.Element {
	const { onResize, width, ...restProps } = props;

	const handle = useMemo(
		() => (
			<SpanStyle
				className="react-resizable-handle"
				onClick={(e): void => e.stopPropagation()}
			/>
		),
		[],
	);

	if (!width) {
		// eslint-disable-next-line react/jsx-props-no-spreading
		return <th {...restProps} />;
	}

	return (
		<Resizable
			width={width}
			height={0}
			handle={handle}
			onResize={onResize}
			draggableOpts={enableUserSelectHack}
		>
			{/* eslint-disable-next-line react/jsx-props-no-spreading */}
			<th {...restProps} />
		</Resizable>
	);
}

interface ResizableHeaderProps {
	onResize: (e: SyntheticEvent<Element>, data: ResizeCallbackData) => void;
	width: number;
}

export default ResizableHeader;
