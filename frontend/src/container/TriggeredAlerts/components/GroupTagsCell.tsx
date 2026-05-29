import { Badge } from '@signozhq/ui/badge';
import ChevronDown from '@signozhq/icons/ChevronDown';
import ChevronRight from '@signozhq/icons/ChevronRight';
import { Button } from '@signozhq/ui/button';
import { GroupedAlert } from 'container/TriggeredAlerts/types';
import { useEffect, useState } from 'react';
import styles from '../TriggeredAlerts.module.scss';

export type GroupTagsCellProps = {
	isExpanded: boolean;
	toggleExpanded: () => void;
	groupRow: GroupedAlert;
};

// TODO(H4ad): Move this to tanstack table as base layer component (same for ExpandButtonWrapper)
export function GroupTagsCell({
	groupRow,
	isExpanded,
	toggleExpanded,
}: GroupTagsCellProps): JSX.Element {
	const tags = Object.entries(groupRow.groupLabels)
		.filter(([, v]) => v)
		.map(([k, v]) => `${k}:${v}`);

	// the state is duplicated because it takes a few ms to propagate using isExpanded
	// so this local is used to avoid this delay
	const [localIsExpanded, setLocalIsExpanded] = useState(isExpanded);

	useEffect(() => {
		setLocalIsExpanded(isExpanded);
	}, [isExpanded]);

	return (
		<div className={styles.groupCell}>
			<Button
				variant="ghost"
				color="secondary"
				size="icon"
				onClick={(e): void => {
					e.stopPropagation();
					setLocalIsExpanded((v) => !v);
					toggleExpanded();
				}}
				prefix={
					localIsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
				}
			/>
			<div className={styles.tagsContainer}>
				{tags.map((tag) => (
					<Badge color="error" key={tag} variant="outline">
						{tag}
					</Badge>
				))}
				{tags.length === 0 ? (
					<Badge color="secondary" variant="outline">
						{'<no-value>'}
					</Badge>
				) : null}
			</div>
		</div>
	);
}
