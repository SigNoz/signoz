import { useCallback } from 'react';
import { Divider } from '@signozhq/ui/divider';
import { Tabs } from '@signozhq/ui/tabs';
import { useConfirmableAction } from 'hooks/useConfirmableAction';

import AttributeMappingHeader from './components/AttributeMappingHeader/AttributeMappingHeader';
import AttributeMappingsTab from './AttributeMappingsTab/AttributeMappingsTab';
import DiscardChangesDialog from './components/DiscardChangesDialog/DiscardChangesDialog';
import GroupFormDrawer from './components/GroupFormDrawer/GroupFormDrawer';
import styles from './LLMObservabilityAttributeMapping.module.scss';
import {
	selectIsDirty,
	useAttributeMappingStore,
} from './store/useAttributeMappingStore';
import { useAttributeMappingSync } from './store/useAttributeMappingSync';
import { useGroupFormDrawer } from './components/GroupFormDrawer/hooks/useGroupFormDrawer';

function LLMObservabilityAttributeMapping(): JSX.Element {
	// Bridges react-query into the store (fetch + seed) and owns save. Mounted
	// once here, at the top of the feature.
	const { save } = useAttributeMappingSync();
	const groupDrawer = useGroupFormDrawer();

	const isDirty = useAttributeMappingStore(selectIsDirty);
	const isSaving = useAttributeMappingStore((state) => state.isSaving);
	const saveError = useAttributeMappingStore((state) => state.saveError);
	const discard = useAttributeMappingStore((state) => state.discard);
	const upsertGroup = useAttributeMappingStore((state) => state.upsertGroup);

	// Discarding wipes the whole working copy, so gate it behind a confirm
	// prompt rather than firing straight from the button.
	const discardConfirm = useConfirmableAction(
		useCallback(async (): Promise<void> => {
			discard();
		}, [discard]),
	);

	const handleGroupSave = useCallback((): void => {
		upsertGroup(groupDrawer.draft);
		groupDrawer.close();
	}, [upsertGroup, groupDrawer]);

	const tabItems = [
		{
			key: 'attribute-mappings',
			label: 'Attribute Mappings',
			children: (
				<AttributeMappingsTab
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
				isDirty={isDirty}
				isSaving={isSaving}
				onDiscard={discardConfirm.request}
				onSave={save}
			/>

			{saveError && (
				<div className={styles.pageError} role="alert">
					{saveError}
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
