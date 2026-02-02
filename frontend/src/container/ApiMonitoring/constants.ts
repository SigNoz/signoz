import { QUERY_BUILDER_KEY_TYPES } from 'constants/antlrQueryConstants';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';

import { SPAN_ATTRIBUTES } from './Explorer/Domains/DomainDetails/constants';

export const ApiMonitoringHardcodedAttributeKeys: QueryKeyDataSuggestionsProps[] = [
	{
		label: 'deployment.environment',
		type: 'resource',
		name: 'deployment.environment',
		signal: 'traces',
		fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
	},
	{
		label: 'service.name',
		type: 'resource',
		name: 'service.name',
		signal: 'traces',
		fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
	},
	{
		label: 'rpc.method',
		type: 'tag',
		name: 'rpc.method',
		signal: 'traces',
		fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
	},
];

export const domainNameKey = SPAN_ATTRIBUTES.SERVER_NAME;
