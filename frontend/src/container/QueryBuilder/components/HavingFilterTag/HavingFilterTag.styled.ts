import { Badge } from '@signozhq/ui/badge';
import styled from 'styled-components';

export const StyledText = styled.span`
	cursor: pointer;
`;

export const StyledTag = styled(Badge).attrs({
	color: 'secondary' as const,
	variant: 'solid' as const,
})`
	margin-top: 0.125rem;
	margin-bottom: 0.125rem;
	padding-left: 0.5rem;
	display: flex;
`;
