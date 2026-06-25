import { Check, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { TabsContent, TabsRoot } from '@signozhq/ui/tabs';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
// eslint-disable-next-line signoz/no-antd-components -- TextArea/Collapse: no @signozhq/ui equivalent
import { Collapse, Input as AntdInput } from 'antd';

import type { VariableType } from '../variableFormModel';
import DynamicVariableFields from './DynamicVariableFields';
import ListVariableFields from './ListVariableFields';
import QueryVariableFields from './QueryVariableFields';
import { useVariableForm } from './useVariableForm';
import VariableTypeTabs from './VariableTypeTabs';
import styles from './VariableForm.module.scss';
import BackToAllVariables from '../components/BackToAllVariables/BackToAllVariables';
import { VariableFormProps } from '../types';
import VariableInfoForm from '../components/VariableInfoForm/VariableInfoForm';

/**
 * In-drawer variable editor reproducing the V1 VariableItem layout, built on
 * @signozhq components (antd kept only for the monaco editor, TextArea, Collapse
 * and searchable selects). Master→detail: renders in place of the list. Form
 * state/handlers live in {@link useVariableForm}; the shared list-type rows in
 * {@link ListVariableFields}.
 */
function VariableForm({
	initial,
	siblings,
	isNew,
	isSaving,
	onClose,
	onSave,
}: VariableFormProps): JSX.Element {
	const {
		model,
		set,
		onNameChange,
		selectType,
		onCustomChange,
		onDynamicChange,
		setRawPreview,
		previewValues,
		previewError,
		setPreviewError,
		defaultValue,
		setDefaultValue,
		visibleNameError,
		nameError,
		attributeError,
		cycleError,
		isListType,
		showAllOptionField,
		payloadVariables,
		handleSave,
	} = useVariableForm({ initial, siblings, isNew, onSave });

	// Shared list rows (preview/sort/multi/default) for the list-type variables;
	// rendered as a sibling inside each list-type panel. Only the active panel
	// mounts (Tabs unmounts the rest), so reusing one element is safe.
	const listFields = isListType ? (
		<ListVariableFields
			model={model}
			onChange={set}
			previewValues={previewValues}
			previewError={previewError}
			defaultValue={defaultValue}
			onDefaultValueChange={setDefaultValue}
			showAllOptionField={showAllOptionField}
		/>
	) : null;

	return (
		<div className={styles.container}>
			<BackToAllVariables onClose={onClose} />

			<div className={styles.content}>
				<VariableInfoForm
					title={model.name}
					description={model.description}
					onTitleChange={onNameChange}
					onDescriptionChange={(value): void => set({ description: value })}
					visibleNameError={visibleNameError}
				/>

				<TabsRoot
					className={styles.typeSection}
					value={model.type}
					onValueChange={(next): void => selectType(next as VariableType)}
				>
					<VariableTypeTabs />

					<TabsContent value="DYNAMIC" className={styles.typePanel}>
						<div className={styles.typeContent}>
							<DynamicVariableFields
								attribute={model.dynamicAttribute}
								signal={model.dynamicSignal}
								onChange={onDynamicChange}
								onPreview={setRawPreview}
								attributeError={attributeError}
							/>
							{listFields}
						</div>
					</TabsContent>

					<TabsContent value="QUERY" className={styles.typePanel}>
						<div className={styles.typeContent}>
							<QueryVariableFields
								queryValue={model.queryValue}
								variables={payloadVariables}
								onChange={(queryValue): void => set({ queryValue })}
								onPreview={setRawPreview}
								onError={setPreviewError}
							/>
							{listFields}
						</div>
					</TabsContent>

					<TabsContent value="CUSTOM" className={styles.typePanel}>
						<div className={styles.typeContent}>
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
							{listFields}
						</div>
					</TabsContent>

					<TabsContent value="TEXT" className={styles.typePanel}>
						<div className={styles.typeContent}>
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
						</div>
					</TabsContent>
				</TabsRoot>

				{cycleError ? (
					<Typography.Text className={styles.errorText}>
						{cycleError}
					</Typography.Text>
				) : null}

				<div className={styles.actionButtons}>
					<Button
						variant="outlined"
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
						disabled={!!nameError || !!attributeError}
						loading={isSaving}
						onClick={handleSave}
						testId="variable-save"
					>
						Save Variable
					</Button>
				</div>
			</div>
		</div>
	);
}

export default VariableForm;
