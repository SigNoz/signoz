import './MetricsSelect.styles.scss';

import { Select } from 'antd';
import { AggregatorFilter } from 'container/QueryBuilder/filters';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { memo, useState } from 'react';
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
	const { handleChangeAggregatorAttribute } = useQueryOperations({
		index,
		query,
		entityVersion: version,
	});

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
				onChange={handleChangeAggregatorAttribute}
				query={query}
				index={index}
				signalSource={signalSource || ''}
			/>
		</div>
	);
});
