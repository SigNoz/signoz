import { DraftGroup } from '../../../../types';
import styles from './GroupHeader.module.scss';

interface GroupHeaderProps {
	group: DraftGroup;
}

// Label content of a group's Collapse header: name plus condition/mapping
// counts. The antd header owns the toggle interaction (click + keyboard +
// aria-expanded); the testid on this wrapper is the stable click target for
// tests, whose clicks bubble up to that header.
function GroupHeader({ group }: GroupHeaderProps): JSX.Element {
	const mapperCount = group.mappers.length;
	// Condition keys (attribute + resource) ship with the group up front, so this
	// count is always trustworthy — shown regardless of expand state.
	const conditionCount = group.attributes.length + group.resource.length;
	// Mappers load lazily on first expand, so the count is only trustworthy once
	// they've been folded into the draft. Gate on the count itself (not on
	// "expanded"): keying off expansion would flash "· 0 mappings" while the
	// panel is still showing skeletons, then jump to the real number. A
	// genuinely empty group shows nothing here — its panel body says so instead.
	const showCount = mapperCount > 0;

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
