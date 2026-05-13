import { Card } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import styled from 'styled-components';

export const Container = styled(Card)`
	.ant-card-body {
		height: 50vh;
		min-height: 350px;
		padding: 0px 12px;
	}
`;

export const ErrorText = styled(Typography)`
	text-align: center;
`;
