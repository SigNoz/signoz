import './DynamicVariable.styles.scss';

import { Select, Typography } from 'antd';
import { useGetFieldKeys } from 'hooks/dynamicVariables/useGetFieldKeys';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FieldKey } from 'types/api/dynamicVariables/getFieldKeys';

enum AttributeSource {
	ALL_SOURCES = 'All Sources',
	LOGS = 'Logs',
	METRICS = 'Metrics',
	TRACES = 'Traces',
}

function DynamicVariable({
	setDynamicVariablesSelectedValue,
}: {
	setDynamicVariablesSelectedValue: Dispatch<
		SetStateAction<
			| {
					name: string;
					value: string;
			  }
			| undefined
		>
	>;
}): JSX.Element {
	const sources = [
		AttributeSource.ALL_SOURCES,
		AttributeSource.LOGS,
		AttributeSource.TRACES,
		AttributeSource.METRICS,
	];

	const [attributeSource, setAttributeSource] = useState<AttributeSource>(
		AttributeSource.ALL_SOURCES,
	);

	const [attributes, setAttributes] = useState<Record<string, FieldKey[]>>({});
	const [selectedAttribute, setSelectedAttribute] = useState<string>();

	const { data, error, isLoading, refetch } = useGetFieldKeys({
		signal:
			attributeSource === AttributeSource.ALL_SOURCES
				? undefined
				: (attributeSource.toLowerCase() as 'traces' | 'logs' | 'metrics'),
	});

	useEffect(() => {
		if (data) {
			setAttributes(data.payload?.keys ?? {});
		}
	}, [data]);

	// refetch when attributeSource changes
	useEffect(() => {
		refetch();
	}, [attributeSource, refetch]);

	// update setDynamicVariablesSelectedValue with debounce when attribute and source is selected
	useEffect(() => {
		if (selectedAttribute && attributeSource) {
			setDynamicVariablesSelectedValue({
				name: selectedAttribute,
				value: attributeSource,
			});
		}
	}, [selectedAttribute, attributeSource, setDynamicVariablesSelectedValue]);

	return (
		<div className="dynamic-variable-container">
			<Select
				placeholder="Select an Attribute"
				options={Object.keys(attributes).map((key) => ({
					label: key,
					value: key,
				}))}
				loading={isLoading}
				status={error ? 'error' : undefined}
				onChange={(value): void => {
					setSelectedAttribute(value);
				}}
			/>
			<Typography className="dynamic-variable-from-text">from</Typography>
			<Select
				placeholder="Source"
				defaultValue={AttributeSource.ALL_SOURCES}
				options={sources.map((source) => ({ label: source, value: source }))}
				onChange={(value): void => setAttributeSource(value)}
			/>
		</div>
	);
}

export default DynamicVariable;
