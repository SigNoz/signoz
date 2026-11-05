import { Combobox } from '@signozhq/ui/combobox';
import type { ComboboxItemType } from '@signozhq/ui/combobox';

interface ProjectIdsInputProps {
	id: string;
	testId: string;
	value: string[];
	onChange: (projectIds: string[]) => void;
}

/** Free-form list of GCP project IDs: type an ID and press Enter to add it. */
function ProjectIdsInput({
	id,
	testId,
	value,
	onChange,
}: ProjectIdsInputProps): JSX.Element {
	const items: ComboboxItemType[] = value.map((projectId) => ({
		type: 'item',
		value: projectId,
		label: projectId,
	}));

	return (
		<Combobox
			id={id}
			testId={testId}
			multiple
			allowCreate
			items={items}
			value={value}
			onChange={onChange}
			placeholder="Add project IDs…"
			searchInputProps={{ placeholder: 'Type a project ID and press Enter' }}
			noContent="Type a project ID to add it"
		/>
	);
}

export default ProjectIdsInput;
