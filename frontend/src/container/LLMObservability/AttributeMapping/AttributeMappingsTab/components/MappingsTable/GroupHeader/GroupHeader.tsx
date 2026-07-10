import { Typography } from '@signozhq/ui/typography';

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
			<Typography.Text
				as="span"
				className={styles.groupName}
				testId={`group-name-${group.localId}`}
			>
				{group.name}
			</Typography.Text>
			<Typography.Text
				as="span"
				className={styles.groupCount}
				testId={`group-condition-count-${group.localId}`}
			>
				· {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
			</Typography.Text>
		</div>
	);
}

export default GroupHeader;
