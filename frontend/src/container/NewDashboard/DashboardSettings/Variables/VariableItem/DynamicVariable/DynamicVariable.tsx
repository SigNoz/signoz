import './DynamicVariable.styles.scss';

import { Select, Typography } from 'antd';
import CustomSelect from 'components/NewSelect/CustomSelect';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useGetFieldKeys } from 'hooks/dynamicVariables/useGetFieldKeys';
import useDebounce from 'hooks/useDebounce';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
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
	const [apiSearchText, setApiSearchText] = useState<string>('');
	const [errorMessage, setErrorMessage] = useState<string>();
	const debouncedApiSearchText = useDebounce(apiSearchText, DEBOUNCE_DELAY);

	const [filteredAttributes, setFilteredAttributes] = useState<
		Record<string, FieldKey[]>
	>({});

	useEffect(() => {
		if (dynamicVariablesSelectedValue?.name) {
			setSelectedAttribute(dynamicVariablesSelectedValue.name);
		}

		if (dynamicVariablesSelectedValue?.value) {
			setAttributeSource(dynamicVariablesSelectedValue.value as AttributeSource);
		}
	}, [
		dynamicVariablesSelectedValue?.name,
		dynamicVariablesSelectedValue?.value,
	]);

	const { data, error, isLoading, refetch } = useGetFieldKeys({
		signal:
			attributeSource === AttributeSource.ALL_SOURCES
				? undefined
				: (attributeSource?.toLowerCase() as 'traces' | 'logs' | 'metrics'),
		name: debouncedApiSearchText,
	});

	const isComplete = useMemo(() => data?.payload?.complete === true, [data]);

	useEffect(() => {
		if (data) {
			const newAttributes = data.payload?.keys ?? {};
			setAttributes(newAttributes);
			setFilteredAttributes(newAttributes);
		}
	}, [data]);

	// refetch when attributeSource changes
	useEffect(() => {
		if (attributeSource) {
			refetch();
		}
	}, [attributeSource, refetch, debouncedApiSearchText]);

	// Handle search based on whether we have complete data or not
	const handleSearch = useCallback(
		(text: string) => {
			if (isComplete) {
				// If complete is true, do client-side filtering
				if (!text) {
					setFilteredAttributes(attributes);
					return;
				}

				const filtered: Record<string, FieldKey[]> = {};
				Object.keys(attributes).forEach((key) => {
					if (key.toLowerCase().includes(text.toLowerCase())) {
						filtered[key] = attributes[key];
					}
				});
				setFilteredAttributes(filtered);
			} else {
				// If complete is false, debounce the API call
				setApiSearchText(text);
			}
		},
		[attributes, isComplete],
	);

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

	const errorText = (error as any)?.message || errorMessage;
	return (
		<div className="dynamic-variable-container">
			<CustomSelect
				placeholder="Select an Attribute"
				options={Object.keys(filteredAttributes).map((key) => ({
					label: key,
					value: key,
				}))}
				loading={isLoading}
				status={errorText ? 'error' : undefined}
				onChange={(value): void => {
					setSelectedAttribute(value);
				}}
				showSearch
				errorMessage={errorText as any}
				value={selectedAttribute || dynamicVariablesSelectedValue?.name}
				onSearch={handleSearch}
				onRetry={(): void => {
					// reset error message
					setErrorMessage(undefined);
					refetch();
				}}
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
