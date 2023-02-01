import { ColumnsType } from 'antd/lib/table';
import React, { useState } from 'react';
import { ResizeCallbackData } from 'react-resizable';

function ResizeTableWrapper(props: ResizeTableWrapperProps): JSX.Element {
	const { columns, children } = props;
	const [columnsData, setColumns] = useState<ColumnsType>(columns);

	const handleResize = React.useCallback(
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

	const mergeColumns = React.useMemo(
		() =>
			columnsData.map((col, index) => ({
				...col,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				onHeaderCell: (column: ColumnsType<any>[number]): any => ({
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
