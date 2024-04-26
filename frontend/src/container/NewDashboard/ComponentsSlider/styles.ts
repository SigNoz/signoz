import { Card as CardComponent, Typography } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	display: flex;
	justify-content: right;
	gap: 8px;
	margin-bottom: 12px;
`;

export const Card = styled(CardComponent)`
	min-height: 80px;
	min-width: 120px;
	overflow-y: auto;
	cursor: pointer;
	transition: transform 0.2s;

	.ant-card-body {
		padding: 12px;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;

		.ant-typography {
			font-size: 12px;
			font-weight: 600;
		}
	}

	&:hover {
		transform: scale(1.05);
		border: 1px solid var(--bg-robin-400);
	}
`;

export const Text = styled(Typography)`
	text-align: center;
	margin-top: 1rem;
`;
