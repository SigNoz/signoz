import { ColumnType } from 'antd/es/table';
import { ColumnsType } from 'antd/lib/table';

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
