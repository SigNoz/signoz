import { Card, Space, Typography } from 'antd';
import styled from 'styled-components';

export const OptionsContainer = styled(Card)`
	.ant-card-body {
		display: flex;
		padding: 0.25rem 0.938rem;
		cursor: pointer;
	}
`;

export const OptionsContentWrapper = styled(Space)`
	min-width: 11rem;
	padding: 0.25rem 0.5rem;
`;

export const FieldTitle = styled(Typography.Text)`
	font-size: 0.75rem;
`;
