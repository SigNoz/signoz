import { DraftGroup } from 'container/LLMObservability/AttributeMapping/types';
import styles from './GroupHeader.module.scss';

interface GroupHeaderProps {
	group: DraftGroup;
	expanded: boolean;
}

// Label content of a group's Collapse header: name plus condition/mapping
// counts. The antd header owns the toggle interaction (click + keyboard +
// aria-expanded); the testid on this wrapper is the stable click target for
// tests, whose clicks bubble up to that header.
function GroupHeader({ group, expanded }: GroupHeaderProps): JSX.Element {
	const mapperCount = group.mappers.length;
	// Condition keys (attribute + resource) ship with the group up front, so this
	// count is always trustworthy — shown regardless of expand state.
	const conditionCount = group.attributes.length + group.resource.length;
	// Mappers load lazily on first expand, so the count is only trustworthy once
	// the group has been opened (or already carries staged/loaded mappers). Hiding
	// it for never-opened groups avoids a misleading "0 mappings".
	const showCount = expanded || mapperCount > 0;

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
			{showCount && (
				<span className={styles.groupCount}>
					· {mapperCount} {mapperCount === 1 ? 'mapping' : 'mappings'}
				</span>
			)}
		</div>
	);
}

export default GroupHeader;
