import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { v4 } from 'uuid';

import { dragHandler, dropHandler } from './utils';

const type = 'DraggableTableRow';

function DraggableTableRow({
	index,
	moveRow,
	className,
	style,
	...restProps
}: DraggableTableRowProps): JSX.Element {
	const ref = useRef<HTMLTableRowElement>(null);
	const [, drop] = useDrop({
		accept: type,
		collect: (monitor) => dropHandler(monitor),
		drop: (item: { index: number }) => moveRow(item.index, index),
	});
	const [, drag] = useDrag({
		type,
		item: { index },
		collect: (monitor) => dragHandler(monitor),
	});
	drop(drag(ref));

	return (
		<tr
			key={v4()}
			ref={ref}
			className={className}
			style={{ ...style }}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...restProps}
		/>
	);
}

interface DraggableTableRowProps
	extends React.HTMLAttributes<HTMLTableRowElement> {
	index: number;
	moveRow: (dragIndex: number, hoverIndex: number) => void;
}

export default DraggableTableRow;
