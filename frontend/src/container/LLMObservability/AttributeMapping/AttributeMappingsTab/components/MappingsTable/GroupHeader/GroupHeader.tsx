import { DraftGroup } from 'container/LLMObservability/AttributeMapping/types';
import styles from './GroupHeader.module.scss';

interface GroupHeaderProps {
	group: DraftGroup;
}

function GroupHeader({ group }: GroupHeaderProps): JSX.Element {
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
