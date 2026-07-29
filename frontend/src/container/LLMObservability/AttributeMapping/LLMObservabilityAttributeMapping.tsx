import { useCallback } from 'react';
import { Divider } from '@signozhq/ui/divider';
import { Tabs } from '@signozhq/ui/tabs';
import { useConfirmableAction } from 'hooks/useConfirmableAction';

import AttributeMappingHeader from './components/AttributeMappingHeader/AttributeMappingHeader';
import AttributeMappingsTab from './AttributeMappingsTab/AttributeMappingsTab';
import DiscardChangesDialog from './components/DiscardChangesDialog/DiscardChangesDialog';
import GroupFormDrawer from './components/GroupFormDrawer/GroupFormDrawer';
import styles from './LLMObservabilityAttributeMapping.module.scss';
import TestTab from './TestTab/TestTab';
import { useAttributeMappingEditor } from './hooks/useAttributeMappingEditor';
import { useGroupFormDrawer } from './components/GroupFormDrawer/hooks/useGroupFormDrawer';
import { useTestSpanMapper } from './TestTab/useTestSpanMapper';

const MAPPINGS_TAB_KEY = 'attribute-mappings';
const TEST_TAB_KEY = 'test';

function LLMObservabilityAttributeMapping(): JSX.Element {
	const editor = useAttributeMappingEditor();
	const groupDrawer = useGroupFormDrawer();
	// Owned here, not inside TestTab: the tabs unmount their inactive panel, so
	// state living in TestTab would be wiped on every tab switch.
	const spanTest = useTestSpanMapper(editor.snapshot, editor.groups);

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
			key: MAPPINGS_TAB_KEY,
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
			key: TEST_TAB_KEY,
			label: 'Test',
			children: <TestTab spanTest={spanTest} />,
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
				defaultValue={MAPPINGS_TAB_KEY}
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
