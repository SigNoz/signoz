import { Button as ButtonComponent, Card as CardComponent } from 'antd';
import styled from 'styled-components';

export const Button = styled(ButtonComponent)`
	&&& {
		position: absolute;
		z-index: 999;
		display: none;
	}
`;

export const Card = styled(CardComponent)`
	.ant-card-body {
		padding: 10px;
	}
`;
