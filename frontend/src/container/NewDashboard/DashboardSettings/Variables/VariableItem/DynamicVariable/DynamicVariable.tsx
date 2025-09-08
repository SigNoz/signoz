import './DynamicVariable.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Select, Typography } from 'antd';
import CustomSelect from 'components/NewSelect/CustomSelect';
import TextToolTip from 'components/TextToolTip';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useGetFieldKeys } from 'hooks/dynamicVariables/useGetFieldKeys';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useDebounce from 'hooks/useDebounce';
import { Info } from 'lucide-react';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { FieldKey } from 'types/api/dynamicVariables/getFieldKeys';
import { isRetryableError as checkIfRetryableError } from 'utils/errorUtils';

enum AttributeSource {
	ALL_TELEMETRY = 'All telemetry',
	LOGS = 'Logs',
	METRICS = 'Metrics',
	TRACES = 'Traces',
}

function DynamicVariable({
	setDynamicVariablesSelectedValue,
	dynamicVariablesSelectedValue,
	errorAttributeKeyMessage,
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
	errorAttributeKeyMessage?: string;
}): JSX.Element {
	const sources = [
		AttributeSource.ALL_TELEMETRY,
		AttributeSource.LOGS,
		AttributeSource.TRACES,
		AttributeSource.METRICS,
	];

	const [attributeSource, setAttributeSource] = useState<AttributeSource>();
	const [attributes, setAttributes] = useState<Record<string, FieldKey[]>>({});
	const [selectedAttribute, setSelectedAttribute] = useState<string>();
	const [apiSearchText, setApiSearchText] = useState<string>('');
	const [errorMessage, setErrorMessage] = useState<string>();
	const [isRetryableError, setIsRetryableError] = useState<boolean>(true);
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
			attributeSource === AttributeSource.ALL_TELEMETRY
				? undefined
				: (attributeSource?.toLowerCase() as 'traces' | 'logs' | 'metrics'),
		name: debouncedApiSearchText,
	});

	const isComplete = useMemo(() => data?.data?.complete === true, [data]);

	useEffect(() => {
		if (data) {
			const newAttributes = data.data?.keys ?? {};
			setAttributes(newAttributes);
			setFilteredAttributes(newAttributes);
		}
	}, [data]);

	// Handle error from useGetFieldKeys
	useEffect(() => {
		if (error) {
			// Check if error is retryable (5xx) or not (4xx)
			const isRetryable = checkIfRetryableError(error);
			setIsRetryableError(isRetryable);
		}
	}, [error]);

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
					AttributeSource.ALL_TELEMETRY,
			});
		}
	}, [
		selectedAttribute,
		attributeSource,
		setDynamicVariablesSelectedValue,
		dynamicVariablesSelectedValue?.name,
		dynamicVariablesSelectedValue?.value,
	]);

	const isDarkMode = useIsDarkMode();
	const errorText = (error as any)?.message || errorMessage;
	return (
		<div className="dynamic-variable-container">
			<div className="dynamic-variable-config-container">
				<CustomSelect
					placeholder="Select a field"
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
						setIsRetryableError(true);
						refetch();
					}}
					showRetryButton={isRetryableError}
				/>
				<Typography className="dynamic-variable-from-text">from</Typography>
				<span style={{ display: 'inline-flex', alignItems: 'center' }}>
					<TextToolTip
						text="By default, this searches across logs, traces, and metrics, which can be slow. Selecting a single source improves performance. Many fields share the same values across different signals (for example, `k8s.pod.name` is identical in logs, traces and metrics) making one source enough. Only use `All telemetry` when you need fields that have different values in different signal types."
						useFilledIcon={false}
						outlinedIcon={
							<Info
								size={14}
								style={{
									color: isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500,
									marginTop: 1,
								}}
							/>
						}
					/>
				</span>
				<Select
					placeholder="Source"
					defaultValue={AttributeSource.ALL_TELEMETRY}
					options={sources.map((source) => ({ label: source, value: source }))}
					onChange={(value): void => setAttributeSource(value as AttributeSource)}
					value={attributeSource || dynamicVariablesSelectedValue?.value}
				/>
			</div>
			{errorAttributeKeyMessage && (
				<div>
					<Typography.Text type="warning">
						{errorAttributeKeyMessage}
					</Typography.Text>
				</div>
			)}
		</div>
	);
}

DynamicVariable.defaultProps = {
	errorAttributeKeyMessage: '',
};

export default DynamicVariable;
