import { ColumnsType } from 'antd/lib/table';
import React, { useCallback, useMemo, useState } from 'react';
import { ResizeCallbackData } from 'react-resizable';

function ResizeTableWrapper({
	children,
	columns,
}: ResizeTableWrapperProps): JSX.Element {
	const [columnsData, setColumns] = useState<ColumnsType>(columns);

	const handleResize = useCallback(
		(index: number) => (
			_e: React.SyntheticEvent<Element>,
			{ size }: ResizeCallbackData,
		): void => {
			const newColumns = [...columnsData];
			newColumns[index] = {
				...newColumns[index],
				width: size.width,
			};
			setColumns(newColumns);
		},
		[columnsData],
	);

	const mergeColumns = useMemo(
		() =>
			columnsData.map((col, index) => ({
				...col,
				onHeaderCell: (column: ColumnsType<unknown>[number]): unknown => ({
					width: column.width,
					onResize: handleResize(index),
				}),
			})),
		[columnsData, handleResize],
	);

	return <> {React.cloneElement(children, { columns: mergeColumns })}</>;
}

interface ResizeTableWrapperProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	columns: ColumnsType<any>;
	children: JSX.Element;
}

export default ResizeTableWrapper;
