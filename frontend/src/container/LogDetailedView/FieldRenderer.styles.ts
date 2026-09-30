import { Badge } from '@signozhq/ui/badge';
import styled from 'styled-components';

export const TagContainer = styled(Badge).attrs({
	color: 'secondary' as const,
	variant: 'outlined' as const,
})`
	&&& {
		border-color: var(--bg-slate-400);
		border-radius: 0.25rem;
		font-weight: 600;
		font-size: var(--font-size-xs);
		line-height: 1.25rem;
	}
`;

export const TagLabel = styled.span`
	color: var(--foreground);
	font-weight: 400;
	font-size: 12px;
`;

export const TagValue = styled.span`
	color: var(--text-sakura-400);
	/* background-color: var(--bg-slate-400); */
	text-transform: capitalize;
	font-size: var(--font-size-xs);
	font-weight: 400;
`;
