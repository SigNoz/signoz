import { Check } from '@signozhq/icons';
import { Tag } from 'antd';
import styled from 'styled-components';

export const TypographyText = styled.span<{
	$isInNin: boolean;
	$isEnabled: boolean;
	$disabled?: boolean;
}>`
	width: ${({ $isInNin }): string => ($isInNin ? '10rem' : 'auto')};
	cursor: ${({ $isEnabled }): string =>
		$isEnabled ? 'not-allowed' : 'pointer'};
	pointer-events: ${({ $isEnabled }): string => ($isEnabled ? 'none' : 'auto')};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	padding-left: 8px;
	${({ $disabled }): string => ($disabled ? 'opacity: 0.6' : '')}
`;

export const StyledCheckOutlined = styled(Check)`
	float: right;
`;

export const TagContainer = styled(Tag)`
	&&& {
		display: inline-block;
		border-radius: 3px;
		padding: 0.1rem 0.2rem;
		font-weight: 300;
		font-size: 0.6rem;
	}
`;

export const TagLabel = styled.span`
	font-weight: 400;
`;

export const TagValue = styled.span`
	text-transform: capitalize;
`;
