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
`;

export const CurrentTagsContainer = styled.div`
	margin-bottom: 1rem;
`;
