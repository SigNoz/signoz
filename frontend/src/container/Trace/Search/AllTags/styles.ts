import { Card } from 'antd';
import styled from 'styled-components';

export const Container = styled(Card)`
	top: 120%;
	min-height: 20vh;
	width: 100%;
	z-index: 2;
	position: absolute;

	.ant-card-body {
		padding-bottom: 0;
		padding-right: 0;
		padding-left: 0;
	}
`;

export const ErrorContainer = styled(Card)`
	top: 120%;
	min-height: 20vh;
	width: 100%;
	z-index: 2;
	position: absolute;

	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
`;

export const Wrapper = styled.div`
	&&& {
		padding-right: 2rem;
		padding-left: 2rem;
	}
`;

export const ButtonContainer = styled.div`
	display: flex;
	justify-content: flex-end;
	align-items: center;
	background-color: #303030;
	padding-top: 11px;
	padding-bottom: 11px;
	padding-right: 38.01px;

	margin-top: 1rem;

	> button:nth-child(1) {
		margin-right: 1rem;
	}
`;

export const CurrentTagsContainer = styled.div`
	margin-bottom: 1rem;
`;
