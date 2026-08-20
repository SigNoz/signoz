import { ReactNode, useCallback, useRef } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import CopyButton from 'periscope/components/CopyButton/CopyButton';

import styles from './EntityMetadataItem.module.scss';
import { useIsTextTruncated } from './useIsTextTruncated';

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
	const valueRef = useRef<HTMLSpanElement>(null);
	const isTruncated = useIsTextTruncated(valueRef, value);

	const handleCopy = useCallback((): void => {
		toast.success(`${label} copied to clipboard`, { position: 'bottom-left' });
	}, [label]);

	// This span, not the Typography inside it, is what truncates and what the
	// tooltip triggers from. TooltipSimple renders asChild, and Typography reads
	// the onClick that Radix merges in as a cue to style itself interactive —
	// pointer cursor and link colour on a value that does nothing when clicked.
	// It also renders whether or not a tooltip is attached, so the measured box
	// stays the same shape across the state flip.
	const valueText = (
		<span ref={valueRef} className={styles.value}>
			<Typography.Text size="small" weight="medium" className={styles.valueText}>
				{value}
			</Typography.Text>
		</span>
	);

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
					{isTruncated ? (
						<TooltipSimple title={value} arrow side="bottom" align="start">
							{valueText}
						</TooltipSimple>
					) : (
						valueText
					)}
					{!!value && (
						<CopyButton
							value={value}
							size={12}
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
