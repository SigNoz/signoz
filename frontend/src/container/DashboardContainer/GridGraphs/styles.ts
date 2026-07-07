import { Card as CardComponent, Row } from 'antd';
import styled from 'styled-components';

export const CardContainer = styled(Row)`
	&&& {
		margin-top: 1rem;
	}
`;

export const Card = styled(CardComponent)`
	&&& {
		cursor: pointer;
	}
	.ant-card-body {
		display: flex;
		width: 100%;
		justify-content: center;
		align-items: center;

		> span {
			margin-right: 0.5rem;
		}
	}
`;

export const GridComponentSliderContainer = styled.div`
	margin-top: 1rem;
`;
