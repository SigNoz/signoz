import { DraftGroup } from '../types';
import styles from './AttributeMappingsTab.module.scss';
import MapperGroupsTable from './components/MapperGroupsTable';
import { AttributeMappingStore } from './hooks/useAttributeMappingStore';

interface AttributeMappingsTabProps {
	store: AttributeMappingStore;
	onEditGroup: (group: DraftGroup) => void;
	onAddGroup: () => void;
}

// "Attribute mappings" tab: the mapping-groups listing, its error state and
// footer summary. The store is owned by the container (the header's save/
// discard share it), so it's passed in rather than created here.
function AttributeMappingsTab({
	store,
	onEditGroup,
	onAddGroup,
}: AttributeMappingsTabProps): JSX.Element {
	return (
		<div data-testid="attribute-mappings-tab">
			{store.isError && (
				<div className={styles.pageError} role="alert">
					Failed to load mapping groups. Please try again.
				</div>
			)}

			<MapperGroupsTable
				store={store}
				onEditGroup={onEditGroup}
				onAddGroup={onAddGroup}
			/>

			<footer className={styles.pageFooter}>
				Showing {store.groups.length} group{store.groups.length === 1 ? '' : 's'}
			</footer>
		</div>
	);
}

export default AttributeMappingsTab;
