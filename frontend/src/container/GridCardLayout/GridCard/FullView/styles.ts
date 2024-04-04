import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

import { GraphContainerProps } from './types';

interface Props {
	$panelType: PANEL_TYPES;
}

export const NotFoundContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 55vh;
`;

export const TimeContainer = styled.div<Props>`
	display: flex;
	justify-content: flex-end;
	align-items: center;
	${({ $panelType }): FlattenSimpleInterpolation =>
		$panelType === PANEL_TYPES.TABLE
			? css`
					margin-bottom: 1rem;
			  `
			: css``}
`;

export const GraphContainer = styled.div<GraphContainerProps>`
	height: ${({ isGraphLegendToggleAvailable }): string =>
		isGraphLegendToggleAvailable ? '50%' : '100%'};
`;

export const LabelContainer = styled.button<{
	isDarkMode?: boolean;
	disabled?: boolean;
}>`
	max-width: 18.75rem;
	cursor: ${(props): string => (props.disabled ? 'no-drop' : 'pointer')};
	border: none;
	background-color: transparent;
	color: ${(props): string =>
		props.isDarkMode ? themeColors.white : themeColors.black};
`;
