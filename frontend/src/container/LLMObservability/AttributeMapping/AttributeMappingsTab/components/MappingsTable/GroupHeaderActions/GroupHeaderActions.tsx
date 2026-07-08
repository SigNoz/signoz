import { Switch } from '@signozhq/ui/switch';

import { MappingGroup } from '../../../../types';
import styles from './GroupHeaderActions.module.scss';

interface GroupHeaderActionsProps {
	group: MappingGroup;
}

// The Collapse header's `extra` slot: the group's read-only enable indicator.
// The switch reflects enabled state but doesn't accept flips in this PR
// (editing lands later). antd toggles the panel on ANY header click, including
// the extra area, so clicks are stopped here — clicking the status control
// shouldn't also expand/collapse the group. The wrapper itself is not
// interactive (the Switch is), hence the a11y-rule disable.
function GroupHeaderActions({ group }: GroupHeaderActionsProps): JSX.Element {
	return (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
		<div
			className={styles.actions}
			onClick={(event): void => event.stopPropagation()}
		>
			<Switch
				value={group.enabled}
				disabled
				testId={`group-enabled-${group.id}`}
			/>
		</div>
	);
}

export default GroupHeaderActions;
