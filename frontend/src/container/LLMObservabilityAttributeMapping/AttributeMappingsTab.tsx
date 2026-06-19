import styles from './LLMObservabilityAttributeMapping.module.scss';
import MapperGroupsTable from './MapperGroupsTable';
import { useAttributeMappingStore } from './useAttributeMappingStore';

// "Attribute mappings" tab: the mapping-groups listing, its load/error states
// and footer summary. Lives in its own tab so siblings (e.g. "Test") can be
// added alongside without entangling this view's data fetching.
function AttributeMappingsTab(): JSX.Element {
	const store = useAttributeMappingStore();

	return (
		<div data-testid="attribute-mappings-tab">
			{store.isError && (
				<div className={styles.pageError} role="alert">
					Failed to load mapping groups. Please try again.
				</div>
			)}

			<MapperGroupsTable store={store} />

			<footer className={styles.pageFooter}>
				Showing {store.groups.length} group{store.groups.length === 1 ? '' : 's'}
			</footer>
		</div>
	);
}

export default AttributeMappingsTab;
