import { useMemo } from 'react';
import { useListSpanMapperGroups } from 'api/generated/services/spanmapper';

import GroupFormDrawer from './GroupFormDrawer';
import MapperGroupsTable from './MapperGroupsTable';
import { MapperGroup } from './types';
import { useGroupFormDrawer } from './useGroupFormDrawer';

import './LLMObservabilityAttributeMapping.styles.scss';

function LLMObservabilityAttributeMapping(): JSX.Element {
	const { data, isLoading, isError } = useListSpanMapperGroups();
	const drawer = useGroupFormDrawer();

	const groups: MapperGroup[] = useMemo(() => data?.data?.items ?? [], [data]);

	return (
		<div
			className="llm-observability-attribute-mapping"
			data-testid="llm-observability-attribute-mapping-page"
		>
			<header className="page-header">
				<div className="page-header__title">
					<h1>Attribute Mapping</h1>
					<p>Configure source-to-target attribute remapping for LLM traces</p>
				</div>
			</header>

			{isError && (
				<div className="page-error" role="alert">
					Failed to load mapping groups. Please try again.
				</div>
			)}

			<MapperGroupsTable
				groups={groups}
				isLoading={isLoading}
				onEdit={drawer.openForEdit}
				onAdd={drawer.openForAdd}
				onDelete={drawer.removeGroup}
				onToggleEnabled={drawer.toggleEnabled}
			/>

			<footer className="page-footer">
				Showing {groups.length} group{groups.length === 1 ? '' : 's'}
			</footer>

			<GroupFormDrawer
				isOpen={drawer.isOpen}
				mode={drawer.mode}
				draft={drawer.draft}
				setDraft={drawer.setDraft}
				onClose={drawer.close}
				onSave={drawer.save}
				onDelete={drawer.deleteGroup}
				isSaving={drawer.isSaving}
				isDeleting={drawer.isDeleting}
				saveError={drawer.saveError}
			/>
		</div>
	);
}

export default LLMObservabilityAttributeMapping;
