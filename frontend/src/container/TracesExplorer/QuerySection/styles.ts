import { Col } from 'antd';
import Card from 'antd/es/card/Card';
import styled from 'styled-components';

export const Container = styled(Card)`
	border: none;
	background: inherit;

	.ant-card-body {
		padding: 0;
	}
`;

export const ButtonWrapper = styled(Col)`
	margin-left: auto;
`;
