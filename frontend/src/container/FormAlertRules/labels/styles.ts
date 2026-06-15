import { grey } from '@ant-design/colors';
import { Badge } from '@signozhq/ui/badge';
import styled from 'styled-components';

interface SearchContainerProps {
	isDarkMode: boolean;
	disabled: boolean;
}

export const SearchContainer = styled.div<SearchContainerProps>`
	border-radius: 4px;
	background: var(--l3-background);
	flex: 1;
	display: flex;
	flex-direction: column;
	padding: 0.2rem;
	border: 1px solid var(--l3-border);
	${({ disabled }): string => (disabled ? `cursor: not-allowed;` : '')}

	input {
		border: none !important;
	}
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
	[data-slot='badge'] {
		margin-right: 0.1rem;
	}
`;

export const QueryChipItem = styled(Badge)`
	margin-right: 0.1rem;
`;
