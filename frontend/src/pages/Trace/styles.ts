import styled from 'styled-components';
import { Card } from 'antd';

export const Container = styled.div`
	display: flex;
	flex: 1;
	min-height: 80vh;

	margin-top: 1rem;
`;

export const LeftContainer = styled(Card)`
	flex: 0.5;
	margin-right: 1rem;

	.ant-card-body {
		padding: 0;
	}
`;

export const RightContainer = styled(Card)`
	&&& {
		flex: 2;
	}
`;
