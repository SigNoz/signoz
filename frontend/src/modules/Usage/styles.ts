import { Card as CardComponent } from 'antd';
import styled from 'styled-components';

export const Card = styled(CardComponent)`
	&&& {
		width: 90%;
		margin-top: 2rem;
	}

	.ant-card-body {
		height: 100%;
		min-height: 70vh;
	}
`;
