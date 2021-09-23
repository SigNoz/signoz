import { Card, Tooltip } from 'antd';
import styled from 'styled-components';

export const Container = styled(Card)`
	&&& {
		position: relative;
	}

	.ant-card-body {
		padding: 0;
		height: 55vh;
		/* padding-bottom: 2rem; */
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
