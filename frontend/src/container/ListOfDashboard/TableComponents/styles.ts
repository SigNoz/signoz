import styled from 'styled-components';

export const TableLinkText = styled.span<{ disabled: boolean }>`
	color: var(--destructive);
	cursor: ${({ disabled }): string => (disabled ? 'not-allowed' : 'pointer')};
	${({ disabled }): string => (disabled ? 'opacity: 0.5;' : '')}
	padding: var(--spacing-3) var(--spacing-4);
`;
