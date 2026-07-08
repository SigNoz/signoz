import styles from './AttributeMappingsTab.module.scss';
import MappingsTable from './components/MappingsTable';
import { useAttributeMappingStore } from './hooks/useAttributeMappingStore';

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

			<MappingsTable store={store} />
		</div>
	);
}

export default AttributeMappingsTab;
