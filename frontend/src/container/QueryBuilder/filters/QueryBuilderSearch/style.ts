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

export const SelectOptionContainer = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

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
