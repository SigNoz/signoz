import { useCallback } from 'react';
import { Divider } from '@signozhq/ui/divider';
import { Tabs } from '@signozhq/ui/tabs';
import { useConfirmableAction } from 'hooks/useConfirmableAction';

import AttributeMappingHeader from './components/AttributeMappingHeader/AttributeMappingHeader';
import AttributeMappingsTab from './AttributeMappingsTab/AttributeMappingsTab';
import DiscardChangesDialog from './components/DiscardChangesDialog/DiscardChangesDialog';
import GroupFormDrawer from './components/GroupFormDrawer/GroupFormDrawer';
import styles from './LLMObservabilityAttributeMapping.module.scss';
import { useAttributeMappingEditor } from './hooks/useAttributeMappingEditor';
import { useGroupFormDrawer } from './components/GroupFormDrawer/hooks/useGroupFormDrawer';

function LLMObservabilityAttributeMapping(): JSX.Element {
	const editor = useAttributeMappingEditor();
	const groupDrawer = useGroupFormDrawer();

	const { discard } = editor;
	// Discarding wipes the whole working copy, so gate it behind a confirm
	// prompt rather than firing straight from the button.
	const discardConfirm = useConfirmableAction(
		useCallback(async (): Promise<void> => {
			discard();
		}, [discard]),
	);

	const handleGroupSave = useCallback((): void => {
		editor.upsertGroup(groupDrawer.draft);
		groupDrawer.close();
	}, [editor, groupDrawer]);

	const tabItems = [
		{
			key: 'attribute-mappings',
			label: 'Attribute Mappings',
			children: (
				<AttributeMappingsTab
					editor={editor}
					onEditGroup={groupDrawer.openForEdit}
					onAddGroup={groupDrawer.openForAdd}
				/>
			),
		},
		{
			key: 'test',
			label: 'Test',
			disabled: true,
			disabledReason: 'Coming soon',
			children: null,
		},
	];

	return (
		<div
			className={styles.llmObservabilityAttributeMapping}
			data-testid="llm-observability-attribute-mapping-page"
		>
			<AttributeMappingHeader
				isDirty={editor.isDirty}
				isSaving={editor.isSaving}
				onDiscard={discardConfirm.request}
				onSave={editor.save}
			/>

			{editor.saveError && (
				<div className={styles.pageError} role="alert">
					{editor.saveError}
				</div>
			)}
			<Divider />

			<Tabs
				testId="attribute-mapping-tabs"
				defaultValue="attribute-mappings"
				items={tabItems}
			/>
			{groupDrawer.isOpen && (
				<GroupFormDrawer
					isOpen={groupDrawer.isOpen}
					mode={groupDrawer.mode}
					draft={groupDrawer.draft}
					setDraft={groupDrawer.setDraft}
					onClose={groupDrawer.close}
					onSave={handleGroupSave}
				/>
			)}
			<DiscardChangesDialog
				open={discardConfirm.open}
				onConfirm={discardConfirm.confirm}
				onCancel={discardConfirm.cancel}
			/>
		</div>
	);
}

export default LLMObservabilityAttributeMapping;
