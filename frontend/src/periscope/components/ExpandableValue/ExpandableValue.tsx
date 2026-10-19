import { ReactNode, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Fullscreen } from '@signozhq/icons';

import styles from './ExpandableValue.module.scss';

const DEFAULT_THRESHOLD = 100;
const DEFAULT_DIALOG_TITLE = 'Value';

const DEFAULT_Z_INDEX = 1100;

interface ExpandableValueProps {
	value: string;
	title?: string;
	threshold?: number;
	zIndex?: number;
	children: ReactNode;
}

function ExpandableValue({
	value,
	title = DEFAULT_DIALOG_TITLE,
	threshold = DEFAULT_THRESHOLD,
	zIndex = DEFAULT_Z_INDEX,
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

			<DialogWrapper
				title={title}
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				className={styles.dialog}
				style={{ zIndex }}
			>
				<pre className={styles.fullValue}>{value}</pre>
			</DialogWrapper>
		</>
	);
}

export default ExpandableValue;
