import { FilterDropdownProps } from 'antd/es/table/interface';

export interface FilterDropdownExtendsProps {
	placeholder: string;
	filterKey: string;
	confirm: FilterDropdownProps['confirm'];
	setSelectedKeys: FilterDropdownProps['setSelectedKeys'];
	selectedKeys: FilterDropdownProps['selectedKeys'];
}
