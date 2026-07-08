import { MappingGroup } from '../../../../types';
import styles from './GroupHeader.module.scss';

interface GroupHeaderProps {
	group: MappingGroup;
}

function GroupHeader({ group }: GroupHeaderProps): JSX.Element {
	const conditionCount = group.attributes.length + group.resource.length;

	return (
		<div
			className={styles.groupHeaderLabel}
			data-testid={`group-expand-${group.id}`}
		>
			<span className={styles.groupName} data-testid={`group-name-${group.id}`}>
				{group.name}
			</span>
			<span
				className={styles.groupCount}
				data-testid={`group-condition-count-${group.id}`}
			>
				· {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
			</span>
		</div>
	);
}

export default GroupHeader;
