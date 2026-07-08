import { Switch } from '@signozhq/ui/switch';

import { DraftGroup } from '../../../types';
import { AttributeMappingStore } from '../../hooks/useAttributeMappingStore';
import styles from './GroupHeaderActions.module.scss';

interface GroupHeaderActionsProps {
	group: DraftGroup;
	store: AttributeMappingStore;
}

// The Collapse header's `extra` slot: the group's enable toggle. antd toggles
// the panel on ANY header click, including the extra area, so clicks are
// stopped here — flipping the switch must not also expand/collapse the group.
// The wrapper itself is not interactive (the Switch is), hence the a11y-rule
// disable.
function GroupHeaderActions({
	group,
	store,
}: GroupHeaderActionsProps): JSX.Element {
	return (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
		<div
			className={styles.actions}
			onClick={(event): void => event.stopPropagation()}
		>
			<Switch
				value={group.enabled}
				onChange={(checked): void => store.toggleGroup(group.localId, checked)}
				testId={`group-enabled-${group.localId}`}
			/>
		</div>
	);
}

export default GroupHeaderActions;
