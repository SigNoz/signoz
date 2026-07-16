import {
	selectIsError,
	useAttributeMappingStore,
} from '../store/useAttributeMappingStore';
import { DraftGroup } from '../types';
import styles from './AttributeMappingsTab.module.scss';
import MappingsTable from './components/MappingsTable/MappingsTable';

interface AttributeMappingsTabProps {
	onEditGroup: (group: DraftGroup) => void;
	onAddGroup: () => void;
}

// "Attribute mappings" tab: the mapping-groups listing and its error state.
// The working copy is read from the shared AttributeMapping store.
function AttributeMappingsTab({
	onEditGroup,
	onAddGroup,
}: AttributeMappingsTabProps): JSX.Element {
	const isError = useAttributeMappingStore(selectIsError);

	return (
		<div data-testid="attribute-mappings-tab">
			{isError ? (
				<div className={styles.pageError} role="alert">
					Failed to load mapping groups. Please try again.
				</div>
			) : (
				<MappingsTable onEditGroup={onEditGroup} onAddGroup={onAddGroup} />
			)}
		</div>
	);
}

export default AttributeMappingsTab;
