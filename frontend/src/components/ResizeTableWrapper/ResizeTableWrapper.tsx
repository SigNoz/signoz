import { ColumnsType } from 'antd/lib/table';
import React, { useState } from 'react';
import { NumberSize } from 're-resizable';
import { Direction } from 're-resizable/lib/resizer';

function ResizeTableWrapper(props: ResizeTableWrapperProps): JSX.Element {
	const { columns, children } = props;
	const [columnsData, setColumns] = useState<ColumnsType>(columns);

	const handleResize = (index: number) => (
		_event: MouseEvent | TouchEvent,
		_direction: Direction,
		elementRef: HTMLElement,
		_delta: NumberSize,
	): void => {
		const newColumns = [...columnsData];
		newColumns[index] = {
			...newColumns[index],
			width: elementRef.style.width,
		};
		setColumns(newColumns);
	};

	const mergeColumns = columnsData.map((col, index) => ({
		...col,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onHeaderCell: (column: ColumnsType<any>[number]): any => ({
			width: column.width,
			onResize: handleResize(index),
		}),
	}));

	return <> {React.cloneElement(children, { columns: mergeColumns })}</>;
}

interface ResizeTableWrapperProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	columns: ColumnsType<any>;
	children: JSX.Element;
}

export default ResizeTableWrapper;
