import { memo, useCallback, useMemo, useState } from 'react';
import { Select } from 'antd';
import {
	initialQueriesMap,
	initialQueryMeterWithType,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { AggregatorFilter } from 'container/QueryBuilder/filters';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

import {
	getPreviousQueryFromKey,
	getQueryKey,
	removeKeyFromPreviousQuery,
	saveAsPreviousQuery,
} from '../previousQuery.utils';

import './MetricsSelect.styles.scss';

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
	savePreviousQuery = false,
}: {
	query: IBuilderQuery;
	index: number;
	version: string;
	signalSource: 'meter' | '';
	onSignalSourceChange: (value: string) => void;
	signalSourceChangeEnabled: boolean;
	savePreviousQuery: boolean;
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

	const {
		updateAllQueriesOperators,
		handleSetQueryData,
		panelType,
	} = useQueryBuilder();

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

	const getDefaultQueryFromSource = useCallback(
		(selectedSource: string): IBuilderQuery => {
			const isMeter = selectedSource === 'meter';
			const baseQuery = isMeter
				? defaultMeterQuery.builder.queryData[0]
				: defaultMetricsQuery.builder.queryData[0];

			return {
				...baseQuery,
				source: isMeter ? 'meter' : '',
				queryName: query.queryName,
			};
		},
		[defaultMeterQuery, defaultMetricsQuery, query.queryName],
	);

	const handleSignalSourceChange = (value: string): void => {
		let newQueryData: IBuilderQuery;

		if (savePreviousQuery) {
			const queryName = query.queryName || '';
			const dataSource = query.dataSource || '';
			const currSignalSource = query.source ?? '';
			const newSignalSource = value === 'meter' ? 'meter' : '';

			const currQueryKey = getQueryKey({
				queryName: queryName,
				dataSource: dataSource,
				signalSource: currSignalSource,
				panelType: panelType || '',
			});

			// save the current query key in session storage
			saveAsPreviousQuery(currQueryKey, query);

			const newQueryKey = getQueryKey({
				queryName: queryName,
				dataSource: dataSource,
				signalSource: newSignalSource,
				panelType: panelType || '',
			});
			const savedQuery: IBuilderQuery | null = getPreviousQueryFromKey(
				newQueryKey,
			);

			// remove the new query key from session storage
			removeKeyFromPreviousQuery(newQueryKey);

			newQueryData = savedQuery
				? savedQuery
				: getDefaultQueryFromSource(newSignalSource);
		} else {
			newQueryData = getDefaultQueryFromSource(value);
		}

		onSignalSourceChange(value);
		handleSetQueryData(index, newQueryData);
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
