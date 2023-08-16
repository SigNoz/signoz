import { Card } from 'antd';
import styled from 'styled-components';

export const Container = styled(Card)`
	min-height: 20vh;
	width: 100%;
	min-width: 81.5vw;
`;

export const ErrorContainer = styled(Card)`
	min-height: 20vh;
	width: 100%;
	z-index: 2;

	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
`;

export const ButtonContainer = styled(Card)`
	display: flex;
	justify-content: flex-end;
	align-items: center;

	padding-top: 11px !important;
	padding-bottom: 11px !important;
	padding-right: 38.01px !important;

	margin-top: 1rem !important;

	.ant-card-body {
		padding: 0;
	}
`;

export const CurrentTagsContainer = styled.div`
	margin-bottom: 1rem;
`;
