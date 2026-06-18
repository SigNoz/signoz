import { useCallback } from 'react';
import { Tabs } from '@signozhq/ui/tabs';

import AttributeMappingHeader from './AttributeMappingHeader';
import AttributeMappingsTab from './AttributeMappingsTab';
import GroupFormDrawer from './GroupFormDrawer';
import { useAttributeMappingStore } from './useAttributeMappingStore';
import { useGroupFormDrawer } from './useGroupFormDrawer';

import './LLMObservabilityAttributeMapping.styles.scss';

function LLMObservabilityAttributeMapping(): JSX.Element {
	const store = useAttributeMappingStore();
	const groupDrawer = useGroupFormDrawer();

	const handleGroupSave = useCallback((): void => {
		store.upsertGroup(groupDrawer.draft);
		groupDrawer.close();
	}, [store, groupDrawer]);

	const handleGroupDelete = useCallback((): void => {
		if (groupDrawer.draft.id) {
			store.removeGroup(groupDrawer.draft.id);
		}
		groupDrawer.close();
	}, [store, groupDrawer]);

	const tabItems = [
		{
			key: 'attribute-mappings',
			label: 'Attribute mappings',
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
			className="llm-observability-attribute-mapping"
			data-testid="llm-observability-attribute-mapping-page"
		>
			<AttributeMappingHeader
				isDirty={store.isDirty}
				isSaving={store.isSaving}
				onDiscard={store.discard}
				onSave={store.save}
			/>

			{store.saveError && (
				<div className="page-error" role="alert">
					{store.saveError}
				</div>
			)}

			<Tabs
				testId="attribute-mapping-tabs"
				defaultValue="attribute-mappings"
				items={tabItems}
			/>

			<GroupFormDrawer
				isOpen={groupDrawer.isOpen}
				mode={groupDrawer.mode}
				draft={groupDrawer.draft}
				setDraft={groupDrawer.setDraft}
				onClose={groupDrawer.close}
				onSave={handleGroupSave}
				onDelete={handleGroupDelete}
				isSaving={false}
				isDeleting={false}
				saveError={null}
			/>
		</div>
	);
}

export default LLMObservabilityAttributeMapping;
