import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { EQueryType } from 'types/common/dashboard';

import QueryTypeTag from '../QueryTypeTag';
import { PlotTagWrapperStyled } from './styles';

interface IPlotTagProps {
	queryType: EQueryType;
	panelType: ITEMS;
}

function PlotTag({ queryType, panelType }: IPlotTagProps): JSX.Element | null {
	if (queryType === undefined) {
		return null;
	}

	return (
		<PlotTagWrapperStyled panelType={panelType}>
			Plotted using <QueryTypeTag queryType={queryType} />
		</PlotTagWrapperStyled>
	);
}

export default PlotTag;
