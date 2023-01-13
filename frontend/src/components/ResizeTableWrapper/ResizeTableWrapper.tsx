/* eslint-disable @typescript-eslint/no-explicit-any */
import { ColumnsType } from 'antd/lib/table';
import React, { useState } from 'react';
import { ResizeCallbackData } from 'react-resizable';

function ResizeTableWrapper(props: {
	columns: ColumnsType;
	children: JSX.Element;
}): JSX.Element {
	const { columns, children } = props;
	const [columnsData, setColumns] = useState<ColumnsType>(columns);

	const handleResize = (index: number) => (
		_e: React.SyntheticEvent<Element>,
		{ size }: ResizeCallbackData,
	): void => {
		const newColumns = [...columnsData];
		newColumns[index] = {
			...newColumns[index],
			width: size.width,
		};
		setColumns(newColumns);
	};

	const mergeColumns = columnsData.map((col, index) => ({
		...col,
		onHeaderCell: (column: ColumnsType<any>[number]): any => ({
			width: column.width,
			onResize: handleResize(index),
		}),
	}));

	return <> {React.cloneElement(children, { columns: mergeColumns })}</>;
}

export default ResizeTableWrapper;
