import { TableProps } from 'antd';
import { CSSProperties } from 'react';

export function getDefaultCellStyle(isDarkMode?: boolean): CSSProperties {
	return {
		paddingTop: 4,
		paddingBottom: 6,
		paddingRight: 8,
		paddingLeft: 8,
		color: isDarkMode ? 'var(--bg-vanilla-400)' : 'var(--bg-slate-400)',
		fontSize: '14px',
		fontStyle: 'normal',
		fontWeight: 400,
		lineHeight: '18px',
		letterSpacing: '-0.07px',
		marginBottom: '0px',
		minWidth: '10rem',
	};
}

export const defaultTableStyle: CSSProperties = {
	minWidth: '40rem',
};

export const defaultListViewPanelStyle: CSSProperties = {
	maxWidth: '40rem',
};

export const tableScroll: TableProps<Record<string, unknown>>['scroll'] = {
	x: true,
};
