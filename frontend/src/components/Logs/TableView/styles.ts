import styled from 'styled-components';

interface TableBodyContentProps {
	linesPerRow: number;
	isDarkMode?: boolean;
}

export const TableBodyContent = styled.div<TableBodyContentProps>`
	margin-bottom: 0;
	color: ${(props): string =>
		props.isDarkMode ? 'var(--bg-vanilla-400, #c0c1c3)' : 'var(--bg-slate-400)'};
	font-size: 14px;
	font-style: normal;
	font-weight: 400;
	line-height: 18px; /* 128.571% */
	letter-spacing: -0.07px;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: ${(props): number => props.linesPerRow};
	line-clamp: ${(props): number => props.linesPerRow};
	-webkit-box-orient: vertical;
`;
