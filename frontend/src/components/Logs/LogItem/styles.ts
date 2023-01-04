import { Card } from 'antd';
import styled, { keyframes } from 'styled-components';

const fadeInAnimation = keyframes`
 0% { opacity: 0; }
 100% { opacity: 1;}
`;

export const Container = styled(Card)`
	width: 100% !important;
	margin-bottom: 0.3rem;
	.ant-card-body {
		padding: 0.3rem 0.6rem;
	}
	animation-name: ${fadeInAnimation};
	animation-duration: 0.2s;
	animation-timing-function: ease-in;
`;
