import styles from './AttributeMappingsTab.module.scss';
import MappingsTable from './components/MappingsTable/MappingsTable';
import { useAttributeMappingStore } from './hooks/useAttributeMappingStore';

function AttributeMappingsTab(): JSX.Element {
	const store = useAttributeMappingStore();

	return (
		<div data-testid="attribute-mappings-tab">
			{store.isError ? (
				<div className={styles.pageError} role="alert">
					Failed to load mapping groups. Please try again.
				</div>
			) : (
				<MappingsTable store={store} />
			)}
		</div>
	);
}

export default AttributeMappingsTab;
