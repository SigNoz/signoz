import styled from 'styled-components';
import { Card } from 'antd';

export const Container = styled(Card)`
	position: absolute;
	top: 120%;
	min-height: 20vh;
	width: 100%;
	z-index: 2;
`;

export const ButtonContainer = styled.div`
	display: flex;
	justify-content: flex-end;
	align-items: center;

	margin-top: 1rem;

	> button:nth-child(1) {
		margin-right: 1rem;
	}
`;

export const CurrentTagsContainer = styled.div`
	margin-bottom: 1rem;
`;
