import React, { useCallback, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

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

	const handleDrop = useCallback(
		(item: { index: number }) => {
			if (moveRow) moveRow(item.index, index);
		},
		[moveRow, index],
	);

	const [, drop] = useDrop({
		accept: type,
		collect: dropHandler,
		drop: handleDrop,
	});

	const [, drag] = useDrag({
		type,
		item: { index },
		collect: dragHandler,
	});
	drop(drag(ref));

	return (
		<tr
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
