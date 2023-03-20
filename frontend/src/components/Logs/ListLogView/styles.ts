import { Card, Typography } from 'antd';
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

export const Text = styled(Typography.Text)`
	&&& {
		min-width: 1.5rem;
		white-space: nowrap;
	}
`;

export const TextContainer = styled.div`
	display: flex;
	overflow: hidden;
	width: 100%;
`;

export const LogContainer = styled.div`
	margin-left: 0.5rem;
`;

export const LogText = styled.div`
	display: inline-block;

	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
`;

export const SelectedLog = styled.div`
	display: flex;
	width: 100%;
	overflow: hidden;
`;
