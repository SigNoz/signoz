import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { WhereClauseConfig } from 'hooks/queryBuilder/useAutoComplete';
import { ReactNode } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { OrderByFilterProps } from './filters/OrderByFilter/OrderByFilter.interfaces';

type FilterConfigs = {
	[Key in keyof Omit<IBuilderQuery, 'filters'>]: {
		isHidden: boolean;
		isDisabled: boolean;
	};
} & { filters: WhereClauseConfig };

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
	filterConfigs?: Partial<FilterConfigs>;
	queryComponents?: { renderOrderBy?: (props: OrderByFilterProps) => ReactNode };
};
