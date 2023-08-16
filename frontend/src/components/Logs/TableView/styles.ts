import styled from 'styled-components';

interface TableBodyContentProps {
	linesPerRow: number;
}

export const TableBodyContent = styled.div<TableBodyContentProps>`
	margin-bottom: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: ${(props): number => props.linesPerRow};
	line-clamp: ${(props): number => props.linesPerRow};
	-webkit-box-orient: vertical;

	font-size: 0.875rem;

	line-height: 2rem;
`;
