import { Card, Tooltip } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import styled from 'styled-components';

interface Props {
	$panelType: PANEL_TYPES;
}

export const Container = styled(Card)<Props>`
	&&& {
		position: relative;
	}

	.ant-card-body {
		padding: 8px;
		height: 57vh;
		overflow: auto;
		display: flex;
		flex-direction: column;
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

export const PlotTagWrapperStyled = styled.div<Props>`
	margin-left: 2rem;
	margin-top: ${({ $panelType }): string =>
		$panelType === PANEL_TYPES.TABLE ? '1rem' : '0'};

	margin-bottom: ${({ $panelType }): string =>
		$panelType === PANEL_TYPES.TABLE ? '1rem' : '0'};
`;
