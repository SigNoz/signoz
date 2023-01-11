// # Global import
import React, { useState } from 'react';
import { ColumnsType } from 'antd/lib/table';
import { ResizeCallbackData } from 'react-resizable';

function ResizeTableWrapper(props: any): JSX.Element {
	const { columns, children } = props;
	const [columnsData, setColumns] = useState<ColumnsType>(columns);

	const handleResize: Function = (index: number) => (
		_: React.SyntheticEvent<Element>,
		{ size }: ResizeCallbackData,
	) => {
		const newColumns = [...columnsData];
		newColumns[index] = {
			...newColumns[index],
			width: size.width,
		};
		setColumns(newColumns);
	};

	const mergeColumns = columnsData.map((col, index) => ({
		...col,
		onHeaderCell: (column: ColumnsType<any>[number]) => ({
			width: column.width,
			onResize: handleResize(index) as React.ReactEventHandler<any>,
		}),
	}));

	return <> {React.cloneElement(children, { columns: mergeColumns })}</>;
}

export default ResizeTableWrapper;
