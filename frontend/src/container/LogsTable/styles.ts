import { Card, Col } from 'antd';
import styled from 'styled-components';

export const Container = styled(Col)`
	overflow-x: hidden;
	width: 100%;
	margin-bottom: 1rem;
`;

export const Heading = styled(Card)`
	margin-bottom: 0.1rem;
	.ant-card-body {
		padding: 0.3rem 0.5rem;
	}
`;
