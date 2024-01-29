import { Typography } from 'antd';
import Card from 'antd/es/card/Card';
import styled from 'styled-components';

export const Container = styled(Card)`
	.ant-card-body {
		height: 50vh;
		min-height: 350px;
	}
`;

export const ErrorText = styled(Typography)`
	text-align: center;
`;
