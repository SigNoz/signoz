import { ReactNode, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import {
	TooltipContent,
	TooltipProvider,
	TooltipRoot,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
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
		<TooltipProvider>
			<TooltipRoot>
				<TooltipTrigger asChild>
					<span className={styles.trigger}>{children}</span>
				</TooltipTrigger>
				<TooltipContent
					className={styles.tooltipContent}
					side="top"
					style={{ zIndex }}
				>
					<pre className={styles.preview}>{value}</pre>
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						prefix={<Fullscreen size={14} />}
						onClick={(): void => setIsDialogOpen(true)}
						className={styles.expandButton}
					>
						Expand
					</Button>
				</TooltipContent>
			</TooltipRoot>

			<DialogWrapper
				title={title}
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				className={styles.dialog}
				style={{ zIndex }}
			>
				<pre className={styles.fullValue}>{value}</pre>
			</DialogWrapper>
		</TooltipProvider>
	);
}

export default ExpandableValue;
