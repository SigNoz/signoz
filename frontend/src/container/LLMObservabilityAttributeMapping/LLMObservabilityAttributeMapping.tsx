import { useCallback } from 'react';

import AttributeMappingHeader from './AttributeMappingHeader';
import GroupFormDrawer from './GroupFormDrawer';
import MapperGroupsTable from './MapperGroupsTable';
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

			{store.isError && (
				<div className="page-error" role="alert">
					Failed to load mapping groups. Please try again.
				</div>
			)}

			<MapperGroupsTable
				store={store}
				onEditGroup={groupDrawer.openForEdit}
				onAddGroup={groupDrawer.openForAdd}
			/>

			<footer className="page-footer">
				Showing {store.groups.length} group{store.groups.length === 1 ? '' : 's'}
			</footer>

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
