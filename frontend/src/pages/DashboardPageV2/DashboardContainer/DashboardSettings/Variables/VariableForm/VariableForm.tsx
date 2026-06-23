import { useEffect, useState } from 'react';
import { ArrowLeft, Check, X } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
// eslint-disable-next-line signoz/no-antd-components -- TextArea/Collapse/searchable Select: no @signozhq/ui equivalent
import { Collapse, Input as AntdInput, Select } from 'antd';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';
import sortValues from 'lib/dashboardVariables/sortVariableValues';

import {
	VARIABLE_SORTS,
	type VariableFormModel,
	type VariableSort,
	type VariableType,
} from '../variableModel';
import DynamicVariableFields from './DynamicVariableFields';
import QueryVariableFields from './QueryVariableFields';
import VariableTypeSelector from './VariableTypeSelector';
import styles from './VariableForm.module.scss';

const SORT_LABEL: Record<VariableSort, string> = {
	DISABLED: 'Disabled',
	ASC: 'Ascending',
	DESC: 'Descending',
};

function getNameError(name: string, existingNames: string[]): string | null {
	if (name === '') {
		return 'Variable name is required';
	}
	if (/\s/.test(name)) {
		return 'Variable name cannot contain whitespaces';
	}
	if (existingNames.includes(name)) {
		return 'Variable name already exists';
	}
	return null;
}

interface VariableFormProps {
	initial: VariableFormModel;
	/** Names of the other variables, for uniqueness validation. */
	existingNames: string[];
	isSaving: boolean;
	onClose: () => void;
	onSave: (model: VariableFormModel) => void;
}

/**
 * In-drawer variable editor reproducing the V1 VariableItem layout, built on
 * @signozhq components (antd kept only for the monaco editor, TextArea, Collapse
 * and searchable selects). Master→detail: renders in place of the list.
 */
function VariableForm({
	initial,
	existingNames,
	isSaving,
	onClose,
	onSave,
}: VariableFormProps): JSX.Element {
	const [model, setModel] = useState<VariableFormModel>(initial);
	const [previewValues, setPreviewValues] = useState<(string | number)[]>([]);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [defaultValue, setDefaultValue] = useState<string>(
		((initial.defaultValue as { value?: string })?.value ?? '') as string,
	);

	useEffect(() => {
		setModel(initial);
		setPreviewValues([]);
		setPreviewError(null);
		setDefaultValue(
			((initial.defaultValue as { value?: string })?.value ?? '') as string,
		);
	}, [initial]);

	const set = (patch: Partial<VariableFormModel>): void =>
		setModel((prev) => ({ ...prev, ...patch }));

	const selectType = (type: VariableType): void => {
		set({ type });
		setPreviewValues([]);
		setPreviewError(null);
	};

	const onCustomChange = (value: string): void => {
		set({ customValue: value });
		setPreviewValues(
			sortValues(commaValuesParser(value), model.sort) as (string | number)[],
		);
	};

	const trimmedName = model.name.trim();
	const nameError = getNameError(trimmedName, existingNames);

	const isListType =
		model.type === 'QUERY' || model.type === 'CUSTOM' || model.type === 'DYNAMIC';
	const showAllOptionField = model.type === 'QUERY' || model.type === 'CUSTOM';

	const handleSave = (): void => {
		onSave({
			...model,
			name: trimmedName,
			defaultValue: defaultValue ? { value: defaultValue } : undefined,
		});
	};

	return (
		<>
			<div className={styles.container}>
				<div className={styles.allVariables}>
					<Button
						variant="ghost"
						color="secondary"
						className={styles.allVariablesBtn}
						prefix={<ArrowLeft size={14} />}
						onClick={onClose}
						testId="variable-form-back"
					>
						All variables
					</Button>
				</div>

				<div className={styles.content}>
					{/* Name */}
					<div className={cx(styles.row, styles.column)}>
						<Typography.Text className={styles.label}>Name</Typography.Text>
						<Input
							className={styles.input}
							value={model.name}
							placeholder="Unique name of the variable"
							onChange={(e): void => set({ name: e.target.value })}
							testId="variable-name-input"
						/>
						{nameError ? (
							<Typography.Text className={styles.errorText}>
								{nameError}
							</Typography.Text>
						) : null}
					</div>

					{/* Description */}
					<div className={cx(styles.row, styles.column)}>
						<Typography.Text className={styles.label}>Description</Typography.Text>
						<AntdInput.TextArea
							className={styles.textarea}
							value={model.description}
							placeholder="Enter a description for the variable"
							rows={3}
							onChange={(e): void => set({ description: e.target.value })}
							data-testid="variable-description-input"
						/>
					</div>

					{/* Variable Type */}
					<VariableTypeSelector value={model.type} onChange={selectType} />

					{/* Type-specific body */}
					{model.type === 'DYNAMIC' ? (
						<DynamicVariableFields
							attribute={model.dynamicAttribute}
							signal={model.dynamicSignal}
							capturingRegexp={model.capturingRegexp}
							onChange={(patch): void => set(patch)}
							onPreview={setPreviewValues}
							onPreviewError={setPreviewError}
						/>
					) : null}

					{model.type === 'QUERY' ? (
						<QueryVariableFields
							queryValue={model.queryValue}
							sort={model.sort}
							onChange={(queryValue): void => set({ queryValue })}
							onPreview={setPreviewValues}
							onError={setPreviewError}
						/>
					) : null}

					{model.type === 'CUSTOM' ? (
						<div className={cx(styles.row, styles.customSection)}>
							<Collapse
								collapsible="header"
								rootClassName="custom-collapse"
								defaultActiveKey={['1']}
								items={[
									{
										key: '1',
										label: 'Options',
										children: (
											<AntdInput.TextArea
												value={model.customValue}
												placeholder="Enter options separated by commas."
												rootClassName="comma-input"
												onChange={(e): void => onCustomChange(e.target.value)}
												data-testid="variable-custom-input"
											/>
										),
									},
								]}
							/>
						</div>
					) : null}

					{model.type === 'TEXT' ? (
						<div className={cx(styles.row, styles.textboxSection)}>
							<div className={styles.labelContainer}>
								<Typography.Text className={styles.label}>
									Default Value
								</Typography.Text>
							</div>
							<Input
								className={styles.defaultInput}
								value={model.textValue}
								placeholder="Enter a default value (if any)..."
								onChange={(e): void => set({ textValue: e.target.value })}
								testId="variable-text-input"
							/>
						</div>
					) : null}

					{/* Shared rows for list-type variables */}
					{isListType ? (
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
								<SelectSimple
									className={styles.sortSelect}
									value={model.sort}
									items={VARIABLE_SORTS.map((sort) => ({
										label: SORT_LABEL[sort],
										value: sort,
									}))}
									onChange={(value): void => set({ sort: value as VariableSort })}
									testId="variable-sort-select"
								/>
							</div>

							<div className={cx(styles.row, styles.multiSection)}>
								<Typography.Text className={styles.rowLabel}>
									Enable multiple values to be checked
								</Typography.Text>
								<Switch
									value={model.multiSelect}
									onChange={(checked): void => {
										set({
											multiSelect: checked,
											showAllOption: checked ? model.showAllOption : false,
										});
									}}
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
										onChange={(checked): void => set({ showAllOption: checked })}
										testId="variable-all-switch"
									/>
								</div>
							) : null}

							<div className={cx(styles.row, styles.defaultValueSection)}>
								<div className={styles.labelContainer}>
									<Typography.Text className={styles.label}>
										Default Value
									</Typography.Text>
									<Typography.Text className={styles.defaultValueDesc}>
										{model.type === 'QUERY'
											? 'Click Test Run Query to see the values or add custom value'
											: 'Select a value from the preview values or add custom value'}
									</Typography.Text>
								</div>
								<Select
									className={styles.searchSelect}
									showSearch
									allowClear
									placeholder="Select a default value"
									value={defaultValue || undefined}
									onChange={(value): void => setDefaultValue(value ?? '')}
									options={previewValues.map((value) => ({
										label: value.toString(),
										value: value.toString(),
									}))}
									data-testid="variable-default-select"
								/>
							</div>
						</>
					) : null}
				</div>
			</div>

			<div className={styles.footer}>
				<Button
					variant="solid"
					color="secondary"
					prefix={<X size={14} />}
					onClick={onClose}
				>
					Discard
				</Button>
				<Button
					variant="solid"
					color="primary"
					prefix={<Check size={14} />}
					disabled={!!nameError}
					loading={isSaving}
					onClick={handleSave}
					testId="variable-save"
				>
					Save Variable
				</Button>
			</div>
		</>
	);
}

export default VariableForm;
