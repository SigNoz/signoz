import { DraftGroup } from '../types';
import { AttributeMappingEditor } from '../hooks/useAttributeMappingEditor';
import styles from './AttributeMappingsTab.module.scss';
import MappingsTable from './components/MappingsTable/MappingsTable';

interface AttributeMappingsTabProps {
	editor: AttributeMappingEditor;
	onEditGroup: (group: DraftGroup) => void;
	onAddGroup: () => void;
}

// "Attribute mappings" tab: the mapping-groups listing and its error state.
// The editor is owned by the container (the header's save/discard share it),
// so it's passed in rather than created here.
function AttributeMappingsTab({
	editor,
	onEditGroup,
	onAddGroup,
}: AttributeMappingsTabProps): JSX.Element {
	return (
		<div data-testid="attribute-mappings-tab">
			{editor.isError ? (
				<div className={styles.pageError} role="alert">
					Failed to load mapping groups. Please try again.
				</div>
			) : (
				<MappingsTable
					editor={editor}
					onEditGroup={onEditGroup}
					onAddGroup={onAddGroup}
				/>
			)}
		</div>
	);
}

export default AttributeMappingsTab;
