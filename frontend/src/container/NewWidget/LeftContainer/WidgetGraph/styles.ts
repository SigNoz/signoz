import { Card, Tooltip } from 'antd';
import styled from 'styled-components';

export const Container = styled(Card)`
	min-height: 55vh;
	position: relative;

	.ant-card-body {
		padding: 0;
	}
`;

export const AlertIconContainer = styled(Tooltip)`
	position: absolute;
	top: 10px;
	left: 10px;
`;
