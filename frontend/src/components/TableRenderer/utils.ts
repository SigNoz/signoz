import type {
	TableColumnsType as ColumnsType,
	TableColumnType as ColumnType,
} from 'antd';

export const generatorResizeTableColumns = <T>({
	baseColumnOptions,
	dynamicColumnOption,
}: GeneratorResizeTableColumnsProp<T>): ColumnsType<T> =>
	baseColumnOptions.map((config: ColumnType<T>) => {
		const { key } = config;
		const extraConfig = dynamicColumnOption.find(
			(dynamicConfigItem) => dynamicConfigItem.key === key,
		);
		return {
			...config,
			...extraConfig?.columnOption,
		};
	});

interface GeneratorResizeTableColumnsProp<T> {
	baseColumnOptions: ColumnsType<T>;
	dynamicColumnOption: { key: string; columnOption: ColumnType<T> }[];
}
