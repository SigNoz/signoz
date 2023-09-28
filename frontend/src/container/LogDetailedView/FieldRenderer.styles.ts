import { Tag } from 'antd';
import styled from 'styled-components';

export const TagContainer = styled(Tag)`
	&&& {
		border-radius: 0.25rem;
		padding: 0.063rem 0.5rem;
		font-weight: 600;
		font-size: 0.75rem;
		line-height: 1.25rem;
	}
`;

export const TagLabel = styled.span`
	font-weight: 400;
`;

export const TagValue = styled.span`
	text-transform: capitalize;
`;
