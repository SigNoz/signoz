import { Space } from 'antd';
import styled from 'styled-components';

export const Container = styled(Space)`
	&&& {
		display: flex;
		margin-top: 1rem;
		margin-bottom: 1rem;
	}

	.ant-space-item:not(:last-child, :nth-child(2)) {
		width: 100%;
	}
	.ant-space-item:nth-child(2) {
		width: 50%;
	}
`;

export const IconContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;

	margin-left: 1.125rem;
`;
