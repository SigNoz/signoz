import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelTypeKeys } from 'types/common/queryBuilder';

import { PanelTypeAndGraphManagerVisibility } from './contants';

export const useShowGraphManager = (panelType: string): boolean => {
	const panelKeys = Object.keys(PANEL_TYPES) as PanelTypeKeys[];
	const graphType = panelKeys.find(
		(key: PanelTypeKeys) => PANEL_TYPES[key] === panelType,
	);
	if (!graphType) {
		return false;
	}
	return PanelTypeAndGraphManagerVisibility[graphType];
};
