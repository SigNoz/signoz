import { PANEL_TYPES } from 'constants/queryBuilder';
import { FC } from 'react';

import ListPanelWrapper from './ListPanelWrapper';
import { PanelWrapperProps } from './panelWrapper.types';
import TablePanelWrapper from './TablePanelWrapper';
import UplotPanelWrapper from './UplotPanelWrapper';
import ValuePanelWrapper from './ValuePanelWrapper';

function PanelWrapper({
	widget,
	queryResponse,
	name,
}: PanelWrapperProps): JSX.Element {
	const PanelTypeVsPanelWrapper = {
		[PANEL_TYPES.TIME_SERIES]: UplotPanelWrapper,
		[PANEL_TYPES.TABLE]: TablePanelWrapper,
		[PANEL_TYPES.LIST]: ListPanelWrapper,
		[PANEL_TYPES.VALUE]: ValuePanelWrapper,
		[PANEL_TYPES.TRACE]: null,
		[PANEL_TYPES.EMPTY_WIDGET]: null,
		[PANEL_TYPES.BAR]: UplotPanelWrapper,
	};

	const Component = PanelTypeVsPanelWrapper[
		widget.panelTypes
	] as FC<PanelWrapperProps>;

	if (!Component) {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}
	return <Component widget={widget} queryResponse={queryResponse} name={name} />;
}

export default PanelWrapper;
