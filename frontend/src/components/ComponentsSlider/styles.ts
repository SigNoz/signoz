import { Card as CardComponent, Typography } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	display: flex;
	gap: 0.6rem;

	> div:first-child {
		margin-left: 0.5rem;
	}
`;

export const Card = styled(CardComponent)`
	min-height: 10vh;
	overflow-y: auto;

	.ant-card-body {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
`;

export const Text = styled(Typography)`
	text-align: center;
	margin-top: 1rem;
`;
