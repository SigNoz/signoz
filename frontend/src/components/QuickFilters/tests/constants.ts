import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { FiltersType } from '../types';

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
