import { ReactNode } from 'react';
import { Minus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from './RowEditor.module.scss';

interface RowEntryProps {
	/** Zero-based; shown to the reader as a count from one. */
	index: number;
	/** Singular noun for one entry, such as "Field" or "Action". */
	noun: string;
	removeLabel: string;
	removeTestId: string;
	onRemove: () => void;
	children: ReactNode;
}

function RowEntry({
	index,
	noun,
	removeLabel,
	removeTestId,
	onRemove,
	children,
}: RowEntryProps): JSX.Element {
	return (
		<div className={styles.entry}>
			<div className={styles.entryTop}>
				<Typography.Text size="sm" className={styles.entryIndex}>
					{noun} {index + 1}
				</Typography.Text>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label={removeLabel}
					onClick={onRemove}
					testId={removeTestId}
				>
					<Minus size={14} />
				</Button>
			</div>
			<div className={styles.entryGrid}>{children}</div>
		</div>
	);
}

export default RowEntry;
