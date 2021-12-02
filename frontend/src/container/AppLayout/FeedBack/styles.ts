import {
	Button as ButtonComponent,
	Card as CardComponent,
	Typography,
	Form,
} from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	position: fixed;
	bottom: 5%;
	right: 4%;
	z-index: 999999;
`;

export const CenterText = styled(Typography)`
	&&& {
		font-size: 0.75rem;
		text-align: center;
		margin-bottom: 0.5rem;
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
	height: 4rem;
	width: 4rem;

	border-radius: 25px;

	background-color: #65b7f3;

	svg {
		width: 2rem;
		height: 2rem;
	}
`;

export const FormItem = styled(Form.Item)`
	margin-top: 0.75rem;
	margin-bottom: 0.75rem;
`;
