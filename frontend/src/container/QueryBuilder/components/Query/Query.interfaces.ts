import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

export type QueryProps = {
	index: number;
	isAvailableToDisable: boolean;
	query: IBuilderQueryForm;
	queryVariant: 'static' | 'dropdown';
	panelType?: ITEMS;
};
