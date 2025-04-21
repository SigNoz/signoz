import { Link } from 'react-router-dom';
import styled from 'styled-components';

export const Button = styled(Link)`
	border: 2px solid #2f80ed;
	box-sizing: border-box;
	border-radius: 10px;
	width: 400px;

	background: inherit;

	font-style: normal;
	font-weight: normal;
	font-size: 24px;
	line-height: 20px;

	display: flex;
	align-items: center;
	justify-content: center;
	padding-top: 14px;
	padding-bottom: 14px;

	color: #2f80ed;
`;

export const Container = styled.div`
	min-height: 80vh;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
`;

export const Text = styled.p`
	font-style: normal;
	font-weight: 300;
	font-size: 18px;
	line-height: 20px;

	display: flex;
	align-items: center;
	text-align: center;

	color: #828282;
	text-align: center;
	margin: 0;

	display: flex;
	justify-content: center;
	align-items: center;
`;

export const TextContainer = styled.div`
	min-height: 50px;
	display: flex;
	justify-content: space-between;
	flex-direction: column;
	margin-bottom: 30px;
	margin-top: 20px;
`;
