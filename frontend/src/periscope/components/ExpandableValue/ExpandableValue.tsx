import { ReactNode, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Dialog } from '@signozhq/ui/dialog';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Fullscreen } from '@signozhq/icons';

import styles from './ExpandableValue.module.scss';

const DEFAULT_THRESHOLD = 100;
const DEFAULT_DIALOG_TITLE = 'Value';

interface ExpandableValueProps {
	value: string;
	title?: string;
	threshold?: number;
	children: ReactNode;
}

function ExpandableValue({
	value,
	title = DEFAULT_DIALOG_TITLE,
	threshold = DEFAULT_THRESHOLD,
	children,
}: ExpandableValueProps): JSX.Element {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	if (value.length <= threshold) {
		return <>{children}</>;
	}

	return (
		<>
			<Tooltip
				side="top"
				title={
					<div className={styles.tooltipContent}>
						<pre className={styles.preview}>{value}</pre>
						<Button
							variant="outlined"
							color="secondary"
							size="sm"
							prefix={<Fullscreen size={14} />}
							onClick={(): void => setIsDialogOpen(true)}
						>
							Expand
						</Button>
					</div>
				}
			>
				<span className={styles.trigger}>{children}</span>
			</Tooltip>

			<Dialog
				title={title}
				open={isDialogOpen}
				onClose={(): void => setIsDialogOpen(false)}
				width="extra-wide"
			>
				<pre className={styles.fullValue}>{value}</pre>
			</Dialog>
		</>
	);
}

export default ExpandableValue;
