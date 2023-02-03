import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

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
		collect: (monitor) => {
			const { index: dragIndex } = monitor.getItem() || {};
			if (dragIndex === index) {
				return {};
			}
			return {
				isOver: monitor.isOver(),
			};
		},
		drop: (item: { index: number }) => {
			moveRow(item.index, index);
		},
	});
	const [, drag] = useDrag({
		type,
		item: { index },
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
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
