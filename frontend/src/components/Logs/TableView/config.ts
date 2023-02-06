import { TableProps } from 'antd';

export const defaultCellStyle: React.CSSProperties = {
	paddingTop: 4,
	paddingBottom: 6,
	paddingRight: 8,
	paddingLeft: 8,
};

export const tableScroll: TableProps<Record<string, unknown>>['scroll'] = {
	x: true,
};
