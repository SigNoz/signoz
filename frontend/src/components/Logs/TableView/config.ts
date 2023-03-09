import { TableProps } from 'antd';
import React from 'react';

export const defaultCellStyle: React.CSSProperties = {
	paddingTop: 4,
	paddingBottom: 6,
	paddingRight: 8,
	paddingLeft: 8,
};

export const defaultTableStyle: React.CSSProperties = {
	minWidth: '40rem',
	maxWidth: '40rem',
};

export const tableScroll: TableProps<Record<string, unknown>>['scroll'] = {
	x: true,
};
