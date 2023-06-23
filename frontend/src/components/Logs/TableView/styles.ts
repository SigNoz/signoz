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

export const AddButtonWrapper = styled.div`
	display: flex;
	gap: 6px;

	button {
		border-radius: 5px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
`;
