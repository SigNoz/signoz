import type { ReactNode } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Skeleton } from '@signozhq/ui/skeleton';
import { Typography } from '@signozhq/ui/typography';

import styles from './ListCommandHeader.module.scss';

interface Props {
	label: string;
	count: number;
	isModified: boolean;
	isCountLoading?: boolean;
	action?: ReactNode;
	// Ids: `${testIdPrefix}-list-heading`.
	testIdPrefix?: string;
}

function ListCommandHeader({
	label,
	count,
	isModified,
	isCountLoading,
	action,
	testIdPrefix,
}: Props): JSX.Element {
	return (
		<div className={styles.commandHeader}>
			<div className={styles.headingBlock}>
				<Typography
					variant="label"
					size="large"
					weight="medium"
					color="main"
					as="h1"
					marginY={4}
					textOverflow="ellipsis"
					testId={testIdPrefix && `${testIdPrefix}-list-heading`}
				>
					{label}
				</Typography>
				{isModified && <span className={styles.dirtyDot} title="Unsaved changes" />}
				{isCountLoading ? (
					<Skeleton.Input size="sm" width={32} />
				) : (
					<Badge variant="solid" color="secondary">
						{count}
					</Badge>
				)}
			</div>
			<div className={styles.grow} />
			{action}
		</div>
	);
}

export default ListCommandHeader;
