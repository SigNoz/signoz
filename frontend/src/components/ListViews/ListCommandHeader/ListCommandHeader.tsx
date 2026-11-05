import type { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';

import styles from './ListCommandHeader.module.scss';

interface Props {
	label: string;
	count: number;
	isModified: boolean;
	action?: ReactNode;
	// Ids: `${testIdPrefix}-list-heading`.
	testIdPrefix: string;
}

function ListCommandHeader({
	label,
	count,
	isModified,
	action,
	testIdPrefix,
}: Props): JSX.Element {
	return (
		<div className={styles.commandHeader}>
			<div className={styles.headingBlock}>
				<Typography.Title
					className={styles.title}
					testId={`${testIdPrefix}-list-heading`}
				>
					{label}
				</Typography.Title>
				{isModified && <span className={styles.dirtyDot} title="Unsaved changes" />}
				<span className={styles.countPill}>{count}</span>
			</div>
			<div className={styles.grow} />
			{action}
		</div>
	);
}

export default ListCommandHeader;
