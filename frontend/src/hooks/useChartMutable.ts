import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelTypeAndGraphManagerVisibility } from 'container/GridGraphLayout/Graph/FullView/contants';
import { PanelTypeKeys } from 'types/common/queryBuilder';

export const useChartMutable = (panelType: string): boolean => {
	const panelKeys = Object.keys(PANEL_TYPES) as PanelTypeKeys[];
	const graphType = panelKeys.find(
		(key: PanelTypeKeys) => PANEL_TYPES[key] === panelType,
	);
	if (!graphType) {
		return false;
	}
	return PanelTypeAndGraphManagerVisibility[graphType];
};
