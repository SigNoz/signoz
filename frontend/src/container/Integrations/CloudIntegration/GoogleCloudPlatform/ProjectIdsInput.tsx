import { ComboboxSimple } from '@signozhq/ui/combobox';
import cx from 'classnames';

import styles from './ProjectIdsInput.module.scss';

interface ProjectIdsInputProps {
	id: string;
	testId: string;
	value: string[];
	onChange: (projectIds: string[]) => void;
	className?: string;
}

/** Free-form list of GCP project IDs: type an ID and press Enter to add it. */
function ProjectIdsInput({
	id,
	testId,
	value,
	onChange,
	className,
}: ProjectIdsInputProps): JSX.Element {
	return (
		<ComboboxSimple
			id={id}
			testId={testId}
			className={cx(styles.projectIds, className)}
			multiple
			allowCreate
			value={value}
			onChange={(next): void => onChange(Array.isArray(next) ? next : [])}
			placeholder="Add project IDs…"
			inputPlaceholder="Type a project ID and press Enter"
			emptyPlaceholder="Type a project ID to add it"
			withPortal={false}
		/>
	);
}

ProjectIdsInput.defaultProps = {
	className: undefined,
};

export default ProjectIdsInput;
