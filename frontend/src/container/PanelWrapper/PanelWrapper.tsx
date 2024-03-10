import { FC } from 'react';

import { PanelTypeVsPanelWrapper } from './constants';
import { PanelWrapperProps } from './panelWrapper.types';

function PanelWrapper({
	widget,
	queryResponse,
	setRequestData,
}: PanelWrapperProps): JSX.Element {
	const Component = PanelTypeVsPanelWrapper[
		selectedGraph || widget.panelTypes
	] as FC<PanelWrapperProps>;

	if (!Component) {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}
	return (
		<Component
			widget={widget}
			queryResponse={queryResponse}
			setRequestData={setRequestData}
		/>
	);
}

export default PanelWrapper;
