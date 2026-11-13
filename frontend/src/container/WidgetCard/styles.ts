import RGL, { WidthProvider } from 'react-grid-layout';
import { Button as ButtonComponent, Card as CardComponent, Space } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { StyledCSS } from 'types/styledComponents';
import styled, { css } from 'styled-components';

const ReactGridLayoutComponent = WidthProvider(RGL);

interface CardProps {
	$panelType: PANEL_TYPES;
	isDarkMode: boolean;
}

export const Card = styled(CardComponent)<CardProps>`
	&&& {
		height: 100%;
		overflow: hidden;
		border-radius: 3px;
		border: 1px solid var(--bg-slate-500);

		${({ isDarkMode }): StyledCSS =>
			!isDarkMode &&
			css`
				border: 1px solid var(--bg-vanilla-300);
				background: unset;
			`}
	}

	.ant-card-body {
		${({ $panelType }): StyledCSS =>
			$panelType === PANEL_TYPES.TABLE
				? css`
						height: 100%;
					`
				: css`
						height: calc(100% - 30px);
					`}
		padding: 0;
	}
`;

export const ReactGridLayout = styled(ReactGridLayoutComponent)`
	border: 1px solid #434343;
	margin-top: 1rem;
	position: relative;
	min-height: 40vh;
	margin: 16px;

	.react-grid-item.react-grid-placeholder {
		background: grey;
		opacity: 0.2;
		transition-duration: 100ms;
		z-index: 2;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		-o-user-select: none;
		user-select: none;
	}
`;

export const ButtonContainer = styled(Space)`
	display: flex;
	justify-content: end;
`;

export const Button = styled(ButtonComponent)`
	&&& {
		display: flex;
		justify-content: center;
		align-items: center;
	}
`;
