import { useEffect, useMemo, useState } from 'react';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
// eslint-disable-next-line signoz/no-antd-components -- searchable async select: no @signozhq/ui equivalent
import { Select } from 'antd';
import { useGetFieldKeys } from 'hooks/dynamicVariables/useGetFieldKeys';
import { useGetFieldValues } from 'hooks/dynamicVariables/useGetFieldValues';
import useDebounce from 'hooks/useDebounce';

import { TELEMETRY_SIGNALS, type TelemetrySignal } from '../variableModel';
import styles from './VariableForm.module.scss';

interface DynamicVariableFieldsProps {
	attribute: string;
	signal: TelemetrySignal;
	onChange: (patch: {
		dynamicAttribute?: string;
		dynamicSignal?: TelemetrySignal;
	}) => void;
	onPreview: (values: (string | number)[]) => void;
}

/** Dynamic-variable body: telemetry signal + field, whose live values preview. */
function DynamicVariableFields({
	attribute,
	signal,
	onChange,
	onPreview,
}: DynamicVariableFieldsProps): JSX.Element {
	const [search, setSearch] = useState('');
	const debouncedSearch = useDebounce(search, 300);

	const { data: keyData, isLoading } = useGetFieldKeys({
		signal,
		name: debouncedSearch || undefined,
	});

	// `keys` is a Record keyed BY field name; the field names are the map keys.
	// When the API reports the list is `complete`, search filters locally.
	const isComplete = keyData?.data?.complete === true;
	const options = useMemo(
		() =>
			Object.keys(keyData?.data?.keys ?? {}).map((name) => ({
				label: name,
				value: name,
			})),
		[keyData],
	);

	const { data: valueData } = useGetFieldValues({
		signal,
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

	return (
		<>
			<div className={cx(styles.row, styles.sortSection)}>
				<div className={styles.labelContainer}>
					<Typography.Text className={styles.label}>Source</Typography.Text>
				</div>
				<SelectSimple
					className={styles.sortSelect}
					value={signal}
					items={TELEMETRY_SIGNALS.map((s) => ({ label: s, value: s }))}
					onChange={(value): void =>
						onChange({ dynamicSignal: value as TelemetrySignal })
					}
					testId="variable-signal-select"
				/>
			</div>
			<div className={cx(styles.row, styles.sortSection)}>
				<div className={styles.labelContainer}>
					<Typography.Text className={styles.label}>Attribute</Typography.Text>
				</div>
				<Select
					className={styles.searchSelect}
					showSearch
					value={attribute || undefined}
					placeholder="Select a telemetry field"
					loading={isLoading}
					filterOption={isComplete}
					onSearch={setSearch}
					onChange={(value): void => onChange({ dynamicAttribute: value as string })}
					options={options}
					notFoundContent={isLoading ? 'Loading…' : 'No fields found'}
					data-testid="variable-field-select"
				/>
			</div>
		</>
	);
}

export default DynamicVariableFields;
