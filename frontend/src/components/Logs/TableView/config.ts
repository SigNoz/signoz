import { TableProps } from 'antd';
import { CSSProperties } from 'react';

export const defaultCellStyle: CSSProperties = {
	paddingTop: 4,
	paddingBottom: 6,
	paddingRight: 8,
	paddingLeft: 8,
	color: 'var(--bg-vanilla-400, #c0c1c3)',
	fontSize: '14px',
	fontStyle: 'normal',
	fontWeight: 400,
	lineHeight: '18px',
	letterSpacing: '-0.07px',
	marginBottom: '0px',
};

export const defaultTableStyle: CSSProperties = {
	minWidth: '40rem',
	maxWidth: '40rem',
};

export const tableScroll: TableProps<Record<string, unknown>>['scroll'] = {
	x: true,
};
