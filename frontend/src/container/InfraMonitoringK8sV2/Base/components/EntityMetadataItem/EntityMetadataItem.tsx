import { ReactNode, useCallback } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import CopyButton from 'periscope/components/CopyButton/CopyButton';

import styles from './EntityMetadataItem.module.scss';

export interface EntityMetadataItemProps {
	label: string;
	value: string;
	/** An entity-supplied renderer, which opts out of clamping, tooltip and copy. */
	renderedValue?: ReactNode;
}

export function EntityMetadataItem({
	label,
	value,
	renderedValue,
}: EntityMetadataItemProps): JSX.Element {
	const handleCopy = useCallback((): void => {
		toast.success(`${label} copied to clipboard`, { position: 'bottom-left' });
	}, [label]);

	return (
		<div className={styles.metadataItem}>
			<Typography.Text
				color="muted"
				size="small"
				weight="medium"
				className={styles.label}
			>
				{label}
			</Typography.Text>

			{renderedValue ?? (
				<div className={styles.valueRow}>
					<TooltipSimple title={value} arrow side="bottom" align="start">
						<span className={styles.value}>
							<Typography.Text
								size="small"
								weight="medium"
								className={styles.valueText}
							>
								{value}
							</Typography.Text>
						</span>
					</TooltipSimple>
					{!!value && (
						<CopyButton
							value={value}
							size={10}
							ariaLabel={`Copy ${label}`}
							className={styles.copyButton}
							testId={`copy-metadata-${label.toLowerCase().replace(/\s+/g, '-')}`}
							onCopy={handleCopy}
						/>
					)}
				</div>
			)}
		</div>
	);
}
