import React from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import { K8sEventRow } from './types';

import styles from './K8sEventsList.module.scss';

interface EventsExpandIconProps {
	expanded: boolean;
	record: K8sEventRow;
	onExpand: (
		record: K8sEventRow,
		e: React.MouseEvent<HTMLElement, MouseEvent>,
	) => void;
}

function EventsExpandIcon({
	expanded,
	record,
	onExpand,
}: EventsExpandIconProps): JSX.Element {
	const handleClick = (e: React.MouseEvent<SVGSVGElement>): void => {
		onExpand(record, e as unknown as React.MouseEvent<HTMLElement, MouseEvent>);
	};

	const Icon = expanded ? ChevronDown : ChevronRight;

	return (
		<Icon
			className={styles.expandIcon}
			size={14}
			onClick={handleClick}
			data-testid={`k8s-events-expand-${record.id}`}
		/>
	);
}

export default EventsExpandIcon;
