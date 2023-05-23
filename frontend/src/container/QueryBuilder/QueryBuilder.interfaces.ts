import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { DataSource } from 'types/common/queryBuilder';

export type QueryBuilderConfig =
	| {
			queryVariant: 'static';
			initialDataSource: DataSource;
	  }
	| { queryVariant: 'dropdown' };

export type QueryBuilderProps = {
	config?: QueryBuilderConfig;
	panelType: ITEMS;
};
