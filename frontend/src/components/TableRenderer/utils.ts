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

export const getLabelRenderingValue = (
	label: string,
	value?: string,
): string => {
	const maxLength = 20;

	if (label.length > maxLength) {
		return `${label.slice(0, maxLength)}...`;
	}

	if (value) {
		const remainingSpace = maxLength - label.length;
		let newValue = value;
		if (value.length > remainingSpace) {
			newValue = `${value.slice(0, remainingSpace)}...`;
		}
		return `${label}: ${newValue}`;
	}

	return label;
};

export const getLabelAndValueContent = (
	label: string,
	value?: string,
): string => {
	if (value) {
		return `${label}: ${value}`;
	}
	return `${label}`;
};

interface GeneratorResizeTableColumnsProp<T> {
	baseColumnOptions: ColumnsType<T>;
	dynamicColumnOption: { key: string; columnOption: ColumnType<T> }[];
}
