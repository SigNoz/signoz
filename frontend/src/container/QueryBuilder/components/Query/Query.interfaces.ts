import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type QueryProps = {
	index: number;
	isAvailableToDisable: boolean;
	query: IBuilderQuery;
	queryVariant: 'static' | 'dropdown';
	panelType: ITEMS;
};
