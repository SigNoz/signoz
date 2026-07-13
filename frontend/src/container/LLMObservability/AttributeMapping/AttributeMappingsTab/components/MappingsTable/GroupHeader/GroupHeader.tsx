import { Typography } from '@signozhq/ui/typography';
import { MappingGroup } from 'container/LLMObservability/AttributeMapping/types';

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
			<Typography.Text
				as="span"
				className={styles.groupName}
				testId={`group-name-${group.id}`}
			>
				{group.name}
			</Typography.Text>
			<Typography.Text
				as="span"
				className={styles.groupCount}
				testId={`group-condition-count-${group.id}`}
			>
				· {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
			</Typography.Text>
		</div>
	);
}

export default GroupHeader;
