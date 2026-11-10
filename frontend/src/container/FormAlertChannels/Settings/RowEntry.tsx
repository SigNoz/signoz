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
	readOnly: boolean;
	children: ReactNode;
}

function RowEntry({
	index,
	noun,
	removeLabel,
	removeTestId,
	onRemove,
	readOnly,
	children,
}: RowEntryProps): JSX.Element {
	return (
		<div className={styles.entry}>
			<div className={styles.entryTop}>
				<Typography
					variant="uppercase"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					{noun} {index + 1}
				</Typography>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label={removeLabel}
					onClick={onRemove}
					disabled={readOnly}
					disabledTooltip={undefined}
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
