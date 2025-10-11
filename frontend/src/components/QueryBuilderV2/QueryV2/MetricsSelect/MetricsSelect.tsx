import './MetricsSelect.styles.scss';

import { AggregatorFilter } from 'container/QueryBuilder/filters';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { memo, useCallback, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export const MetricsSelect = memo(function MetricsSelect({
	query,
	index,
	version,
	signalSource,
}: {
	query: IBuilderQuery;
	index: number;
	version: string;
	signalSource: 'meter' | '';
}): JSX.Element {
	const [attributeKeys, setAttributeKeys] = useState<BaseAutocompleteData[]>([]);

	const { handleChangeAggregatorAttribute } = useQueryOperations({
		index,
		query,
		entityVersion: version,
	});

	const handleAggregatorAttributeChange = useCallback(
		(value: BaseAutocompleteData, isEditMode?: boolean) => {
			handleChangeAggregatorAttribute(value, isEditMode, attributeKeys || []);
		},
		[handleChangeAggregatorAttribute, attributeKeys],
	);
	return (
		<div className="metrics-select-container">
			<AggregatorFilter
				onChange={handleAggregatorAttributeChange}
				query={query}
				index={index}
				signalSource={signalSource || ''}
				setAttributeKeys={setAttributeKeys}
			/>
		</div>
	);
});
