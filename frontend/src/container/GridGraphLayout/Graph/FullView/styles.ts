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

export const FilterTableAndSaveContainer = styled.div`
	margin-top: 1.875rem;
	display: flex;
	align-items: flex-end;
`;

export const FilterTableContainer = styled.div`
	flex-basis: 80%;
`;

export const SaveContainer = styled.div`
	flex-basis: 20%;
	display: flex;
	justify-content: flex-end;
`;

export const SaveCancelButtonContainer = styled.span`
	margin: 0 0.313rem;
`;

export const LabelContainer = styled.button`
	max-width: 18.75rem;
	cursor: pointer;
	border: none;
	background-color: transparent;
	color: ${themeColors.white};
`;
