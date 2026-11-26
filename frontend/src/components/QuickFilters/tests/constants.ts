import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { FiltersType, QuickFilterCheckboxUseFieldApis } from '../types';

export const QuickFiltersConfig = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Environment',
		attributeKey: {
			key: 'deployment.environment',
			dataType: DataTypes.String,
			type: 'resource',
		},
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Service Name',
		attributeKey: {
			key: 'service.name',
			dataType: DataTypes.String,
			type: 'resource',
		},
		defaultOpen: false,
	},
];

export const QuickFiltersFieldApis: QuickFilterCheckboxUseFieldApis = {
	startUnixMilli: 1700000000000,
	endUnixMilli: 1700003600000,
	existingQuery: null,
};
