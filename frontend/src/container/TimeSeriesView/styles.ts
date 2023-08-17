import { Typography } from 'antd';
import Card from 'antd/es/card/Card';
import styled from 'styled-components';

export const Container = styled(Card)`
	position: relative;
	margin: 0.5rem 0 3.1rem 0;

	.ant-card-body {
		height: 50vh;
		min-height: 350px;
	}
`;

export const ErrorText = styled(Typography)`
	text-align: center;
`;
