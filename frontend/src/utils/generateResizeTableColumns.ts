import { ColumnType } from 'antd/es/table';
import { ColumnsType } from 'antd/lib/table';

export const generatorResizeTableColumns = <T>({
	columnKey,
	columnConfig,
}: GeneratorResizeTableColumnsProp<T>): ColumnsType<T> =>
	columnKey.map((key: string) => {
		const column = columnConfig.find(
			(config: ColumnType<T>) => config.key === key,
		) as ColumnType<T>;
		return {
			key,
			...column,
		};
	});

interface GeneratorResizeTableColumnsProp<T> {
	columnKey: string[];
	columnConfig: ColumnsType<T>;
}
