import { Button, Card } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	display: flex;
	flex: 1;
	min-height: 80vh;
	margin-top: 1rem;
`;

export const LeftContainer = styled(Card)`
	flex: 0.5;
	margin-right: 0.5rem;
	width: 15rem;

	.ant-card-body {
		padding: 0;
	}
`;

export const RightContainer = styled(Card)`
	&&& {
		flex: 2;
	}

	.ant-card-body {
		padding: 0.5rem;
	}
`;

export const ClearAllFilter = styled(Button)`
	&&& {
		width: 95%;
		margin-bottom: 0.5rem;
	}
`;
