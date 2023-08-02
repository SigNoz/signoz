import { ColumnType } from 'antd/es/table';
import { ColumnsType } from 'antd/lib/table';

export const generatorResizeTableColumns = <T>({
	baseConfig,
	dynamicConfig,
}: GeneratorResizeTableColumnsProp<T>): ColumnsType<T> =>
	baseConfig.map((config: ColumnType<T>) => {
		const { key } = config;
		const extraConfig = dynamicConfig.find(
			(dynamicConfigItem) => dynamicConfigItem.key === key,
		);
		return {
			...config,
			...extraConfig?.extraConfig,
		};
	});

interface GeneratorResizeTableColumnsProp<T> {
	baseConfig: ColumnsType<T>;
	dynamicConfig: { key: string; extraConfig: ColumnType<T> }[];
}
