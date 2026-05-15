import { Copy } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { toast } from '@signozhq/ui/sonner';
import {
	TooltipContent,
	TooltipRoot,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { useCopyToClipboard } from 'react-use';

import styles from './LabelTag.module.scss';

export interface LabelTagProps {
	label: string;
	color?:
		| 'primary'
		| 'secondary'
		| 'success'
		| 'error'
		| 'warning'
		| 'robin'
		| 'forest'
		| 'amber'
		| 'sienna'
		| 'cherry'
		| 'sakura'
		| 'aqua'
		| 'vanilla';
	value?: string;
}

function LabelTag({ label, value, color }: LabelTagProps): JSX.Element {
	const [, copyToClipboard] = useCopyToClipboard();
	const displayText = value ? `${label}: ${value}` : label;
	const searchFormat = value ? `${label} ${value}` : label;

	const handleCopy = (e: React.MouseEvent): void => {
		e.stopPropagation();
		copyToClipboard(searchFormat);
		toast.success('Copied! Use in search to filter alerts.');
	};

	return (
		<TooltipRoot>
			<TooltipTrigger asChild>
				<span>
					<Badge
						color={color}
						className={styles.labelBadge}
						variant="outline"
						data-testid={`label-tag-${label}`}
					>
						<span className={styles.labelValue}>{displayText}</span>
					</Badge>
				</span>
			</TooltipTrigger>
			<TooltipContent>
				<div className={styles.tooltipContent}>
					<span>{displayText}</span>
					<button
						type="button"
						className={styles.copyButton}
						onClick={handleCopy}
						aria-label="Copy to clipboard"
					>
						<Copy size={12} />
					</button>
				</div>
			</TooltipContent>
		</TooltipRoot>
	);
}

export default LabelTag;
