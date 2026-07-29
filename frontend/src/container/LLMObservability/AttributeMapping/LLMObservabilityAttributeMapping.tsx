import { useCallback, useMemo, useState } from 'react';
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
import {
	MAPPINGS_TAB_KEY,
	TEST_TAB_DISABLED_LOAD_FAILED,
	TEST_TAB_DISABLED_NO_GROUPS,
	TEST_TAB_KEY,
} from './constants';

function LLMObservabilityAttributeMapping(): JSX.Element {
	const editor = useAttributeMappingEditor();
	const groupDrawer = useGroupFormDrawer();
	const [activeTab, setActiveTab] = useState<string>(MAPPINGS_TAB_KEY);
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

	const testDisabledReason = useMemo((): string | null => {
		if (editor.isLoading) {
			return null;
		}
		if (editor.isError) {
			return TEST_TAB_DISABLED_LOAD_FAILED;
		}
		if (editor.groups.length === 0) {
			return TEST_TAB_DISABLED_NO_GROUPS;
		}
		return null;
	}, [editor.isLoading, editor.isError, editor.groups.length]);

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
			disabled: testDisabledReason !== null,
			disabledReason: testDisabledReason ?? undefined,
			children: <TestTab spanTest={spanTest} />,
		},
	];

	const selectedTab =
		activeTab === TEST_TAB_KEY && testDisabledReason !== null
			? MAPPINGS_TAB_KEY
			: activeTab;

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
				value={selectedTab}
				onChange={setActiveTab}
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
