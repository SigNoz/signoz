import { grey } from '@ant-design/colors';
import { Tag } from 'antd';
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

export const QueryChipItem = styled(Tag)`
	margin-right: 0.1rem;
`;
