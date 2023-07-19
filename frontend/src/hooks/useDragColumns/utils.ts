import { ColumnsType } from 'antd/es/table';

const filterColumns = <T>(
	initialColumns: ColumnsType<T>,
	findColumns: ColumnsType<T>,
	isColumnExist = true,
): ColumnsType<T> =>
	initialColumns.filter(({ title: columnTitle }) => {
		const column = findColumns.find(({ title }) => title === columnTitle);

		return isColumnExist ? !!column : !column;
	});

export const getDraggedColumns = <T>(
	currentColumns: ColumnsType<T>,
	draggedColumns: ColumnsType<T>,
): ColumnsType<T> => {
	if (draggedColumns.length) {
		const actualDruggedColumns = filterColumns<T>(draggedColumns, currentColumns);
		const newColumns = filterColumns<T>(
			currentColumns,
			actualDruggedColumns,
			false,
		);

		return [...actualDruggedColumns, ...newColumns].reduce((acc, { title }) => {
			const column = currentColumns.find(
				({ title: columnTitle }) => title === columnTitle,
			);

			if (column) return [...acc, column];
			return acc;
		}, [] as ColumnsType<T>);
	}

	return currentColumns;
};
