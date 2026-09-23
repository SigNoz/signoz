import { Copy } from '@signozhq/icons';
import { Badge, type BadgeColorType } from '@signozhq/ui/badge';
import { toast } from '@signozhq/ui/sonner';
import { Tooltip } from '@signozhq/ui/tooltip';
import { useCopyToClipboard } from 'react-use';

import styles from './LabelTag.module.scss';

export interface LabelTagProps {
	label: string;
	color?: BadgeColorType;
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
		<Tooltip
			title={
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
			}
		>
			<span>
				<Badge
					color={color ?? 'secondary'}
					className={styles.labelBadge}
					variant="outlined"
					testId={`label-tag-${label}`}
				>
					<span className={styles.labelValue}>{displayText}</span>
				</Badge>
			</span>
		</Tooltip>
	);
}

export default LabelTag;
