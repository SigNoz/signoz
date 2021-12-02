import {
	Button as ButtonComponent,
	Card as CardComponent,
	Typography,
} from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	position: fixed;
	bottom: 5%;
	right: 5%;
	z-index: 999999;
`;

export const CenterText = styled(Typography)`
	&&& {
		text-align: center;
	}
`;

export const TitleContainer = styled.div`
	&&& {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
`;

export const Card = styled(CardComponent)`
	&&& {
		min-width: 400px;
	}
`;

export const ButtonContainer = styled.div`
	display: flex;
	justify-content: flex-end;
	align-items: center;
`;

export const Button = styled(ButtonComponent)`
	height: 4.5rem;
	width: 4.5rem;
	border-radius: 30px;
	background-color: #65b7f3;

	svg {
		width: 2rem;
		height: 2rem;
	}
`;
