import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { ReactNode } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
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
	actions?: ReactNode;
	filterConfigs?: Partial<
		Record<keyof IBuilderQuery, { isHidden: boolean; isDisabled: boolean }>
	>;
};
