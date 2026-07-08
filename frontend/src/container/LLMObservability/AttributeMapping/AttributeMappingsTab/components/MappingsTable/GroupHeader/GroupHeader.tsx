import { DraftGroup } from '../../../../types';
import styles from './GroupHeader.module.scss';

interface GroupHeaderProps {
	group: DraftGroup;
}

// Label content of a group's Collapse header: name plus condition count. The
// antd header owns the toggle interaction (click + keyboard + aria-expanded);
// the testid on this wrapper is the stable click target for tests, whose
// clicks bubble up to that header. A mapping count isn't shown here: mappers
// are fetched lazily per panel and not lifted to the group level in this
// read-only PR, so the group has no trustworthy count to display.
function GroupHeader({ group }: GroupHeaderProps): JSX.Element {
	// Condition keys (attribute + resource) ship with the group up front, so this
	// count is always trustworthy — shown regardless of expand state.
	const conditionCount = group.attributes.length + group.resource.length;

	return (
		<div
			className={styles.groupHeaderLabel}
			data-testid={`group-expand-${group.localId}`}
		>
			<span
				className={styles.groupName}
				data-testid={`group-name-${group.localId}`}
			>
				{group.name}
			</span>
			<span
				className={styles.groupCount}
				data-testid={`group-condition-count-${group.localId}`}
			>
				· {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
			</span>
		</div>
	);
}

export default GroupHeader;
