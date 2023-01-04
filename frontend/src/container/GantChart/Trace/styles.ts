import { volcano } from '@ant-design/colors';
import styled, {
	css,
	DefaultTheme,
	ThemedCssFunction,
} from 'styled-components';

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
		border-left: ${({ isOnlyChild }): StyledCSS =>
			isOnlyChild && 'none'} !important;

		${({ isOnlyChild }): StyledCSS =>
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

export const CardContainer = styled.li<{ isMissing?: boolean }>`
	display: flex;
	width: 100%;
	cursor: pointer;
	border-radius: 0.25rem;
	z-index: 2;
	${({ isMissing }): string =>
		isMissing ? `border: 1px dashed ${volcano[6]} !important;` : ''}
`;

interface Props {
	isDarkMode: boolean;
}

export type StyledCSS =
	| ReturnType<ThemedCssFunction<DefaultTheme>>
	| string
	| false
	| undefined;

export const CardComponent = styled.div<Props>`
	border: 1px solid
		${({ isDarkMode }): StyledCSS => (isDarkMode ? '#434343' : '#333')};
	box-sizing: border-box;
	border-radius: 2px;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 1px 8px;
	background: ${({ isDarkMode }): StyledCSS =>
		isDarkMode ? '#1d1d1d' : '#ddd'};
	height: 22px;
`;

export const CaretContainer = styled.span`
	margin-left: 0.304rem;
`;

interface HoverCardProps {
	isHovered: boolean;
	isSelected: boolean;
	top: number;
	isDarkMode: boolean;
}

export const HoverCard = styled.div<HoverCardProps>`
	display: ${({ isSelected, isHovered }): string =>
		isSelected || isHovered ? 'block' : 'none'};
	width: 200%;
	background-color: ${({ isHovered, isDarkMode }): string => {
		if (isHovered) {
			return isDarkMode ? '#262626' : '#ddd';
		}
		return isDarkMode ? '#4f4f4f' : '#bbb';
	}};
	position: absolute;
	top: 0;
	left: -100%;
	right: 0;
	height: 3rem;
	opacity: 0.5;
`;

const flexNoWrap = css`
	flex-wrap: nowrap;
`;

const overFlowHidden = css`
	overflow: hidden;
`;

export const styles = {
	flexNoWrap,
	overFlowHidden,
};
