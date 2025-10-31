import './MetricsSelect.styles.scss';

import { Select } from 'antd';
import {
	initialQueriesMap,
	initialQueryMeterWithType,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { AggregatorFilter } from 'container/QueryBuilder/filters';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { memo, useCallback, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

export const SOURCE_OPTIONS: SelectOption<string, string>[] = [
	{ value: 'metrics', label: 'Metrics' },
	{ value: 'meter', label: 'Meter' },
];

export const MetricsSelect = memo(function MetricsSelect({
	query,
	index,
	version,
	signalSource,
	onSignalSourceChange,
	signalSourceChangeEnabled = false,
}: {
	query: IBuilderQuery;
	index: number;
	version: string;
	signalSource: 'meter' | '';
	onSignalSourceChange: (value: string) => void;
	signalSourceChangeEnabled: boolean;
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

	const { updateAllQueriesOperators, handleSetQueryData } = useQueryBuilder();

	const source = useMemo(
		() => (signalSource === 'meter' ? 'meter' : 'metrics'),
		[signalSource],
	);

	const defaultMeterQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueryMeterWithType,
				PANEL_TYPES.BAR,
				DataSource.METRICS,
				'meter' as 'meter' | '',
			),
		[updateAllQueriesOperators],
	);

	const defaultMetricsQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap.metrics,
				PANEL_TYPES.BAR,
				DataSource.METRICS,
				'',
			),
		[updateAllQueriesOperators],
	);

	const handleSignalSourceChange = (value: string): void => {
		onSignalSourceChange(value);
		handleSetQueryData(
			index,
			value === 'meter'
				? {
						...defaultMeterQuery.builder.queryData[0],
						source: 'meter',
						queryName: query.queryName,
				  }
				: {
						...defaultMetricsQuery.builder.queryData[0],
						source: '',
						queryName: query.queryName,
				  },
		);
	};

	return (
		<div className="metrics-source-select-container">
			{signalSourceChangeEnabled && (
				<Select
					className="source-selector"
					placeholder="Source"
					options={SOURCE_OPTIONS}
					value={source}
					defaultValue="metrics"
					onChange={handleSignalSourceChange}
				/>
			)}

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
