import { Card, Tooltip } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import styled from 'styled-components';

interface Props {
	panelType: ITEMS;
}

export const Container = styled(Card)<Props>`
	&&& {
		position: relative;
	}

	.ant-card-body {
		padding: ${({ panelType }): string =>
			panelType === PANEL_TYPES.TABLE ? '0 0' : '1.5rem 0'};
		height: 57vh;
		overflow: scroll;
	}
`;

export const AlertIconContainer = styled(Tooltip)`
	position: absolute;
	top: 10px;
	left: 10px;
`;

export const NotFoundContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 47vh;
`;
