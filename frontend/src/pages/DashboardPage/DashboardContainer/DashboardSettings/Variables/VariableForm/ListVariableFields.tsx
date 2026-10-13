import { Badge } from '@signozhq/ui/badge';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
// eslint-disable-next-line signoz/no-antd-components -- fixed-option sort picker
import { Select } from 'antd';
import { CustomSelect } from 'components/NewSelect';

import {
	VARIABLE_SORT_LABEL,
	VARIABLE_SORTS,
	type VariableFormModel,
	type VariableSort,
} from '../variableFormModel';
import styles from './VariableForm.module.scss';

interface ListVariableFieldsProps {
	model: VariableFormModel;
	onChange: (patch: Partial<VariableFormModel>) => void;
	previewValues: (string | number)[];
	previewError: string | null;
	defaultValue: string;
	onDefaultValueChange: (value: string) => void;
	/** Whether the "ALL values" toggle applies to this type (QUERY / CUSTOM). */
	showAllOptionField: boolean;
}

/**
 * Rows shared by the list-style variables (Query / Custom / Dynamic): the value
 * preview, sort, multi-select / ALL toggles and the default-value picker.
 */
function ListVariableFields({
	model,
	onChange,
	previewValues,
	previewError,
	defaultValue,
	onDefaultValueChange,
	showAllOptionField,
}: ListVariableFieldsProps): JSX.Element {
	return (
		<>
			<div className={cx(styles.row, styles.previewSection)}>
				<Typography.Text className={styles.previewLabel}>
					Preview of Values
				</Typography.Text>
				<div className={styles.previewValues}>
					{previewError ? (
						<Typography.Text className={styles.previewError}>
							{previewError}
						</Typography.Text>
					) : (
						previewValues.map((value, idx) => (
							<Badge
								// eslint-disable-next-line react/no-array-index-key -- preview values are display-only and may contain duplicates
								key={`${value}-${idx}`}
								color="vanilla"
							>
								{value.toString()}
							</Badge>
						))
					)}
				</div>
			</div>

			<div className={cx(styles.row, styles.sortSection)}>
				<div className={styles.labelContainer}>
					<Typography.Text className={styles.label}>Sort Values</Typography.Text>
				</div>
				<Select
					className={styles.sortSelect}
					popupMatchSelectWidth={false}
					value={model.sort}
					options={VARIABLE_SORTS.map((sort) => ({
						label: VARIABLE_SORT_LABEL[sort],
						value: sort,
					}))}
					onChange={(value): void => onChange({ sort: value as VariableSort })}
					data-testid="variable-sort-select"
				/>
			</div>

			<div className={cx(styles.row, styles.multiSection)}>
				<Typography.Text className={styles.rowLabel}>
					Enable multiple values to be checked
				</Typography.Text>
				<Switch
					value={model.multiSelect}
					onChange={(checked): void =>
						onChange({
							multiSelect: checked,
							showAllOption: checked ? model.showAllOption : false,
						})
					}
					testId="variable-multi-switch"
				/>
			</div>

			{model.multiSelect && showAllOptionField ? (
				<div className={cx(styles.row, styles.allOptionSection)}>
					<Typography.Text className={styles.rowLabel}>
						Include an option for ALL values
					</Typography.Text>
					<Switch
						value={model.showAllOption}
						onChange={(checked): void => onChange({ showAllOption: checked })}
						testId="variable-all-switch"
					/>
				</div>
			) : null}

			<div className={cx(styles.row, styles.defaultValueSection)}>
				<div className={styles.labelContainer}>
					<Typography.Text className={styles.label}>Default Value</Typography.Text>
					<Typography.Text className={styles.defaultValueDesc}>
						{model.type === 'QUERY'
							? 'Click Test Run Query to see the values or add custom value'
							: 'Select a value from the preview values or add custom value'}
					</Typography.Text>
				</div>
				<CustomSelect
					className={styles.searchSelect}
					showSearch
					allowClear
					placeholder="Select a default value"
					value={defaultValue || undefined}
					onChange={(value): void => onDefaultValueChange((value as string) ?? '')}
					options={previewValues.map((value) => ({
						label: value.toString(),
						value: value.toString(),
					}))}
					data-testid="variable-default-select"
				/>
			</div>
		</>
	);
}

export default ListVariableFields;
