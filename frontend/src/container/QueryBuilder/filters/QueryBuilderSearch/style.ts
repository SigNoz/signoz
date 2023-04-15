import { CheckOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import styled from 'styled-components';

export const TypographyText = styled(Typography.Text)<{ isInNin: boolean }>`
	width: ${({ isInNin }): string => (isInNin ? '10rem' : 'auto')};
`;

export const StyledCheckOutlined = styled(CheckOutlined)`
	float: right;
`;
