import { Info } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { DraftGroup } from 'container/LLMObservability/AttributeMapping/types';

import ConditionsTooltip from './ConditionsTooltip';
import styles from './GroupHeader.module.scss';

interface GroupHeaderProps {
	group: DraftGroup;
}

// Label content of a group's Collapse header: name plus condition/mapping
// counts. The antd header owns the toggle interaction (click + keyboard +
// aria-expanded); the testid on this wrapper is the stable click target for
// tests, whose clicks bubble up to that header.
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
			<TooltipSimple
				title={
					<ConditionsTooltip
						attributes={group.attributes}
						resource={group.resource}
					/>
				}
				side="bottom"
				align="start"
			>
				<span
					className={styles.conditionCount}
					data-testid={`group-condition-count-${group.localId}`}
				>
					· {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
					<Info size={12} className={styles.conditionInfoIcon} />
				</span>
			</TooltipSimple>
		</div>
	);
}

export default GroupHeader;
