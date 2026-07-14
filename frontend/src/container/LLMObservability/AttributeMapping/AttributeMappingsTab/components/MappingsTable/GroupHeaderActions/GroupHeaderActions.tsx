import { Switch } from '@signozhq/ui/switch';

import { MappingGroup } from 'container/LLMObservability/AttributeMapping/types';
import styles from './GroupHeaderActions.module.scss';

interface GroupHeaderActionsProps {
	group: MappingGroup;
}

function GroupHeaderActions({ group }: GroupHeaderActionsProps): JSX.Element {
	return (
		<div
			className={styles.actions}
			onClick={(event): void => event.stopPropagation()}
		>
			<Switch
				value={group.enabled}
				// We don't yet support toggling a group's enabled state in this read-only PR, so disable the switch. A later PR will add the toggle handler and its drawer.
				disabled
				testId={`group-enabled-${group.id}`}
			/>
		</div>
	);
}

export default GroupHeaderActions;
