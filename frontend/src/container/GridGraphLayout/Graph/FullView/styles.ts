import { PANEL_TYPES } from 'constants/queryBuilder';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

interface Props {
	$panelType: ITEMS;
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
