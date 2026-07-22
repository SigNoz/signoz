import { useEffect, useMemo, useState } from 'react';
import { Info } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
// eslint-disable-next-line signoz/no-antd-components -- fixed-option signal picker
import { Select } from 'antd';
import { CustomSelect } from 'components/NewSelect';
import TextToolTip from 'components/TextToolTip';
import { useGetFieldKeys } from 'hooks/dynamicVariables/useGetFieldKeys';
import { useGetFieldValues } from 'hooks/dynamicVariables/useGetFieldValues';
import useDebounce from 'hooks/useDebounce';
import { isRetryableError } from 'utils/errorUtils';

import {
	DYNAMIC_SIGNAL_LABEL,
	DYNAMIC_SIGNALS,
	type DynamicSignalOption,
	signalForApi,
} from '../variableFormModel';
import styles from './VariableForm.module.scss';

interface DynamicVariableFieldsProps {
	attribute: string;
	signal: DynamicSignalOption;
	onChange: (patch: {
		dynamicAttribute?: string;
		dynamicSignal?: DynamicSignalOption;
	}) => void;
	onPreview: (values: (string | number)[]) => void;
	/** Inline error shown under the attribute field (e.g. duplicate attribute). */
	attributeError?: string;
}

/** Dynamic-variable body: telemetry signal + field, whose live values preview. */
function DynamicVariableFields({
	attribute,
	signal,
	onChange,
	onPreview,
	attributeError,
}: DynamicVariableFieldsProps): JSX.Element {
	const [search, setSearch] = useState('');
	const debouncedSearch = useDebounce(search, 500);
	const apiSignal = signalForApi(signal);

	const {
		data: keyData,
		isLoading,
		error,
		refetch,
	} = useGetFieldKeys({
		signal: apiSignal,
		name: debouncedSearch || undefined,
	});

	// `keys` is a Record keyed BY field name; the field names are the map keys.
	// CustomSelect filters the supplied options locally as the user types.
	const options = useMemo(
		() =>
			Object.keys(keyData?.data?.keys ?? {}).map((name) => ({
				label: name,
				value: name,
			})),
		[keyData],
	);

	const { data: valueData } = useGetFieldValues({
		signal: apiSignal,
		name: attribute,
		enabled: !!attribute,
	});

	useEffect(() => {
		const payload = valueData?.data;
		const values =
			payload?.normalizedValues ?? payload?.values?.StringValues ?? [];
		onPreview(values);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [valueData]);

	const errorMessage = error ? (error as Error).message || null : null;

	return (
		<>
			{/* Combined row retained from V1: the field on the left, `from` + the
			    telemetry source on the right. */}
			<div className={cx(styles.row, styles.dynamicCombinedRow)}>
				<CustomSelect
					className={styles.dynamicFieldSelect}
					showSearch
					value={attribute || undefined}
					placeholder="Select a field"
					loading={isLoading}
					options={options}
					onSearch={setSearch}
					onChange={(value): void => onChange({ dynamicAttribute: value as string })}
					noDataMessage="No fields found"
					errorMessage={errorMessage}
					onRetry={(): void => {
						void refetch();
					}}
					showRetryButton={error ? isRetryableError(error) : true}
					data-testid="variable-field-select"
				/>
				<Typography.Text className={styles.fromText}>from</Typography.Text>
				<TextToolTip
					text="By default, this searches across logs, traces, and metrics, which can be slow. Selecting a single source improves performance. Many fields share the same values across different signals (for example, `k8s.pod.name` is identical in logs, traces and metrics) making one source enough. Only use `All telemetry` when you need fields that have different values in different signal types."
					useFilledIcon={false}
					outlinedIcon={<Info size={14} />}
				/>
				<Select
					className={styles.dynamicSourceSelect}
					popupMatchSelectWidth={false}
					value={signal}
					options={DYNAMIC_SIGNALS.map((s) => ({
						label: DYNAMIC_SIGNAL_LABEL[s],
						value: s,
					}))}
					onChange={(value): void =>
						onChange({ dynamicSignal: value as DynamicSignalOption })
					}
					data-testid="variable-signal-select"
				/>
			</div>
			{attributeError ? (
				<Typography.Text className={styles.errorText}>
					{attributeError}
				</Typography.Text>
			) : null}
		</>
	);
}

export default DynamicVariableFields;
