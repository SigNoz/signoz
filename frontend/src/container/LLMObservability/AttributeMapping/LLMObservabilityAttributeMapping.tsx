import { useCallback } from 'react';
import { Divider } from '@signozhq/ui/divider';
import { Tabs } from '@signozhq/ui/tabs';

import AttributeMappingHeader from './components/AttributeMappingHeader/AttributeMappingHeader';
import AttributeMappingsTab from './AttributeMappingsTab/AttributeMappingsTab';
import GroupFormDrawer from './components/GroupFormDrawer/GroupFormDrawer';
import styles from './LLMObservabilityAttributeMapping.module.scss';
import { useAttributeMappingStore } from './AttributeMappingsTab/hooks/useAttributeMappingStore';
import { useGroupFormDrawer } from './components/GroupFormDrawer/hooks/useGroupFormDrawer';

function LLMObservabilityAttributeMapping(): JSX.Element {
	const store = useAttributeMappingStore();
	const groupDrawer = useGroupFormDrawer();

	const handleGroupSave = useCallback((): void => {
		store.upsertGroup(groupDrawer.draft);
		groupDrawer.close();
	}, [store, groupDrawer]);

	const tabItems = [
		{
			key: 'attribute-mappings',
			label: 'Attribute Mappings',
			children: (
				<AttributeMappingsTab
					store={store}
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
				isDirty={store.isDirty}
				isSaving={store.isSaving}
				onDiscard={store.discard}
				onSave={store.save}
			/>

			{store.saveError && (
				<div className={styles.pageError} role="alert">
					{store.saveError}
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
		</div>
	);
}

export default LLMObservabilityAttributeMapping;
