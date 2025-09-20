import './MetricsSelect.styles.scss';

import { Select } from 'antd';
import { AggregatorFilter } from 'container/QueryBuilder/filters';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { memo, useCallback, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
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

	const [source, setSource] = useState<string>(
		signalSource === 'meter' ? 'meter' : 'metrics',
	);

	const handleSignalSourceChange = (value: string): void => {
		setSource(value);
		onSignalSourceChange(value);
	};

	return (
		<div className="metrics-source-select-container">
			<Select
				className="source-selector"
				placeholder="Source"
				options={SOURCE_OPTIONS}
				value={source}
				onChange={handleSignalSourceChange}
				disabled={!signalSourceChangeEnabled}
			/>
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
