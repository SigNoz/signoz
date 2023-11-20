import { CheckOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
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
