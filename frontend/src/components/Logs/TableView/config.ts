import { TableProps } from 'antd';
import { CSSProperties } from 'react';

export const defaultCellStyle: CSSProperties = {
	paddingTop: 4,
	paddingBottom: 6,
	paddingRight: 8,
	paddingLeft: 8,
};

export const defaultTableStyle: CSSProperties = {
	minWidth: '40rem',
	maxWidth: '40rem',
};

export const tableScroll: TableProps<Record<string, unknown>>['scroll'] = {
	x: true,
};
