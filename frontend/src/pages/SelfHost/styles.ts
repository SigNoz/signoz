import { Button, Card, Input as AntdInput } from 'antd';
import styled from 'styled-components';

export const HeaderSection = styled.div`
	background-color: #3f4c5d;
	height: 8rem;
	margin: 0 -16px;
	margin-bottom: 7rem;
`;

export const Title = styled.h1`
	font-size: 3rem;
	color: white;

	> span {
		color: #ff6b00;
	}
`;

export const ListItem = styled.p`
	font-size: 1.5rem;
	color: white;
`;

export const FormTitle = styled.h1`
	font-size: 1.5rem;
	color: white;
	margin: 0;
	margin-bottom: 27px;
`;

export const FormWrapper = styled(Card)`
	display: flex;
	justify-content: center;
	max-width: 600px;
	flex: 1;
	background-color: #373737;
	border-radius: 6px;

	.ant-card-body {
		padding: 45px 62px;
	}
`;

export const SubmitButton = styled(Button)`
	background-color: #ff6b00;
	width: 100%;
	&:hover {
		background-color: #ff6b00 !important;
	}
	height: 4rem;
	border-radius: 4px;
	font-size: 2rem;
`;

export const Input = styled(AntdInput)`
	height: 4rem;
	background-color: #5c5c5c;
	&::placeholder {
		color: #c1c1c1;
	}
	font-size: 1.5rem;
	margin-bottom: 33px;
`;
