import { Card } from 'antd';
import styled from 'styled-components';

export const CardStyled = styled(Card)`
	border: none !important;
	position: relative;
	margin-bottom: 16px;
	.ant-card-body {
		height: 200px;
		min-height: 200px;
		padding: 0 12px 12px;

		font-family: monospace;
	}
`;
