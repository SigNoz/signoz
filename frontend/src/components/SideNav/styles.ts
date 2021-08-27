import styled from "styled-components";

export const ThemeSwitcherWrapper = styled.div`
	display: flex;
	justify-content: center;
	margin-top: 24px;
	margin-bottom: 16px;
`;

export const Logo = styled.img<LogoProps>`
	width: 100px;
	margin: 5%;
	display: ${({ collapsed }) => (!collapsed ? "block" : "none")};
`;

interface LogoProps {
	collapsed: boolean;
}
