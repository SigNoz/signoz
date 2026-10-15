import { useState } from 'react';
import { Button } from '@signozhq/ui/button';

import type { PlacementStatus as Status, UnplacedRow } from './utils';

import styles from './LocationSection.module.scss';

interface PlacementStatusProps {
	status: Status;
	unplaced: UnplacedRow[];
}

/** How many rows the preview placed, with the rest listed on demand. */
function PlacementStatus({
	status,
	unplaced,
}: PlacementStatusProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className={styles.status} data-testid="geo-location-status">
			<div className={styles.statusLine}>
				<span className={styles.dot} data-tone={status.tone} />
				<span className={`${styles.muted} ${styles.statusText}`}>
					{status.text}
				</span>
				{unplaced.length > 0 && (
					<Button
						variant="link"
						color="primary"
						size="sm"
						data-testid="geo-location-show-unplaced"
						onClick={(): void => setIsOpen((open) => !open)}
					>
						{isOpen ? 'Hide' : 'Show which'}
					</Button>
				)}
			</div>
			{isOpen && (
				<div className={styles.unplaced} data-testid="geo-location-unplaced">
					{unplaced.map((row) => (
						<div key={`${row.value}-${row.why}`} className={styles.unplacedRow}>
							<span className={styles.mono}>{row.value}</span>
							<span className={`${styles.muted} ${styles.unplacedWhy}`}>
								{row.why}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default PlacementStatus;
