import { grey } from '@ant-design/colors';
import { Badge } from '@signozhq/ui/badge';
import styled from 'styled-components';

export const SearchContainer = styled.div`
	width: 100%;
	display: flex;
	align-items: center;
	gap: 0.2rem;
	padding: 0 0.2rem;
	box-sizing: border-box;
	border-radius: 3px;
`;

export const QueryChipContainer = styled.span`
	display: flex;
	align-items: center;
	margin-right: 0.5rem;
	&:hover {
		& > * {
			background: ${grey.primary}44;
		}
	}
`;

export const QueryChipItem = styled(Badge).attrs({
	color: 'secondary' as const,
	variant: 'solid' as const,
	textTransform: 'none' as const,
})`
	margin-right: 0.1rem;
`;

export const QueryChipRemoveButton = styled.button`
	display: flex;
	align-items: center;
	padding: 0;
	border: none;
	background: none;
	color: inherit;
	cursor: pointer;
	opacity: 0.6;

	&:hover {
		opacity: 1;
	}
`;
