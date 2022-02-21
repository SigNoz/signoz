import styled, { css } from 'styled-components';

interface Props {
	isOnlyChild: boolean;
}

export const Wrapper = styled.ul<Props>`
	display: flex;
	flex-direction: column;
	padding-bottom: 0.5rem;
	padding-top: 0.5rem;

	position: relative;
	z-index: 1;

	ul {
		border-left: ${({ isOnlyChild }) => isOnlyChild && 'none'} !important;

		${({ isOnlyChild }) =>
			isOnlyChild &&
			css`
				&:before {
					border-left: 1px solid #434343;
					display: inline-block;
					content: '';
					height: 54px;
					position: absolute;
					left: 0;
					top: -35px;
				}
			`}
	}
`;

export const CardContainer = styled.li`
	display: flex;
	width: 100%;
`;

export const CardComponent = styled.div`
	border: 1px solid #434343;
	box-sizing: border-box;
	border-radius: 2px;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 1px 8px;
	background: #1d1d1d;
	height: 22px;
`;

export const CaretContainer = styled.span`
	margin-left: 0.304rem;
`;

interface HoverCardProps {
	isHovered: boolean;
	top: number;
}

export const HoverCard = styled.div<HoverCardProps>`
	display: ${({ isHovered }) => (isHovered ? 'block' : 'none')};
	left: 200px;
	width: 100vw;

	position: fixed;
	top: ${({ top }) => `${top}px`};
	height: 3.5rem;
	background-color: #262626;
	opacity: 0.5;
`;
