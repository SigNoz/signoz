import { SelectProps } from 'antd';
import { DataSource } from 'types/common/queryBuilder';

type StaticLabel = { variant: 'static'; dataSource: DataSource };

export type DropdownLabel = {
	variant: 'dropdown';
	onChange: (value: DataSource) => void;
} & Omit<SelectProps, 'onChange'>;

export type QueryLabelProps = StaticLabel | DropdownLabel;

export function isLabelDropdown(
	label: QueryLabelProps,
): label is DropdownLabel {
	return label.variant === 'dropdown';
}
