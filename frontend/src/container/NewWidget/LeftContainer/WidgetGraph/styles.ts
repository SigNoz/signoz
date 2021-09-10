import { Card, Tooltip } from 'antd';
import styled from 'styled-components';

export const Container = styled(Card)`
	&&& {
		min-height: 55vh;
		position: relative;
	}

	.ant-card-body {
		padding: 0;
		min-height: 55vh;
	}
`;

export const AlertIconContainer = styled(Tooltip)`
	position: absolute;
	top: 10px;
	left: 10px;
`;

export const NotFoundContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 55vh;
`;
