import styled from "styled-components";
import { Link } from "react-router-dom";

const ButtonContainer = styled(Link)`
	height: 100%;
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

export default ButtonContainer;
