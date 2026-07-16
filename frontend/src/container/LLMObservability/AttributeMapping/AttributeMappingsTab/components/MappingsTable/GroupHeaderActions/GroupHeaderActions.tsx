import { Switch } from '@signozhq/ui/switch';

import { DraftGroup } from 'container/LLMObservability/AttributeMapping/types';
import GroupActionsMenu from '../GroupActionsMenu/GroupActionsMenu';
import styles from './GroupHeaderActions.module.scss';

interface GroupHeaderActionsProps {
	group: DraftGroup;
	onToggle: (localId: string, enabled: boolean) => void;
	onEdit: (group: DraftGroup) => void;
	onRemove: (localId: string) => void;
}

function GroupHeaderActions({
	group,
	onToggle,
	onEdit,
	onRemove,
}: GroupHeaderActionsProps): JSX.Element {
	return (
		<div
			className={styles.actions}
			onClick={(event): void => event.stopPropagation()}
		>
			<Switch
				value={group.enabled}
				onChange={(checked): void => onToggle(group.localId, checked)}
				testId={`group-enabled-${group.localId}`}
			/>
			<GroupActionsMenu group={group} onEdit={onEdit} onRemove={onRemove} />
		</div>
	);
}

export default GroupHeaderActions;
