import { Badge } from '@signozhq/ui/badge';
import styled from 'styled-components';

export const TagContainer = styled(Badge).attrs({
	color: 'secondary',
	variant: 'outline',
})`
	&&& {
		display: flex;
		font-weight: 300;
		font-size: 0.6rem;
	}
`;

export const TagLabel = styled.span`
	font-weight: 400;
`;

export const TagValue = styled.span`
	text-transform: capitalize;
	font-weight: 400;
`;
