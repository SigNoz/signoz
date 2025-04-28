import './DynamicVariable.styles.scss';

import { Select, Typography } from 'antd';
import CustomSelect from 'components/NewSelect/CustomSelect';
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
	dynamicVariablesSelectedValue,
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
	dynamicVariablesSelectedValue:
		| {
				name: string;
				value: string;
		  }
		| undefined;
}): JSX.Element {
	const sources = [
		AttributeSource.ALL_SOURCES,
		AttributeSource.LOGS,
		AttributeSource.TRACES,
		AttributeSource.METRICS,
	];

	const [attributeSource, setAttributeSource] = useState<AttributeSource>();

	const [attributes, setAttributes] = useState<Record<string, FieldKey[]>>({});
	const [selectedAttribute, setSelectedAttribute] = useState<string>();

	const { data, error, isLoading, refetch } = useGetFieldKeys({
		signal:
			attributeSource === AttributeSource.ALL_SOURCES
				? undefined
				: (attributeSource?.toLowerCase() as 'traces' | 'logs' | 'metrics'),
		enabled: !!attributeSource,
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
		if (selectedAttribute || attributeSource) {
			setDynamicVariablesSelectedValue({
				name: selectedAttribute || dynamicVariablesSelectedValue?.name || '',
				value:
					attributeSource ||
					dynamicVariablesSelectedValue?.value ||
					AttributeSource.ALL_SOURCES,
			});
		}
	}, [
		selectedAttribute,
		attributeSource,
		setDynamicVariablesSelectedValue,
		dynamicVariablesSelectedValue?.name,
		dynamicVariablesSelectedValue?.value,
	]);

	return (
		<div className="dynamic-variable-container">
			<CustomSelect
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
				showSearch
				errorMessage={error as any}
				value={selectedAttribute || dynamicVariablesSelectedValue?.name}
			/>
			<Typography className="dynamic-variable-from-text">from</Typography>
			<Select
				placeholder="Source"
				defaultValue={AttributeSource.ALL_SOURCES}
				options={sources.map((source) => ({ label: source, value: source }))}
				onChange={(value): void => setAttributeSource(value as AttributeSource)}
				value={attributeSource || dynamicVariablesSelectedValue?.value}
			/>
		</div>
	);
}

export default DynamicVariable;
