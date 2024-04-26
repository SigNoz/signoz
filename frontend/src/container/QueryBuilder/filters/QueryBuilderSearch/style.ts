import { CheckOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import styled from 'styled-components';

export const TypographyText = styled(Typography.Text)<{
	$isInNin: boolean;
	$isEnabled: boolean;
}>`
	width: ${({ $isInNin }): string => ($isInNin ? '10rem' : 'auto')};
	cursor: ${({ $isEnabled }): string =>
		$isEnabled ? 'not-allowed' : 'pointer'};
	pointer-events: ${({ $isEnabled }): string => ($isEnabled ? 'none' : 'auto')};
`;

export const StyledCheckOutlined = styled(CheckOutlined)`
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
