import { ReactNode, useCallback, useRef } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import CopyButton from 'periscope/components/CopyButton/CopyButton';

import styles from './EntityMetadataItem.module.scss';
import { useIsTextClamped } from './useIsTextClamped';

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
	const isClamped = useIsTextClamped(valueRef, value);

	const handleCopy = useCallback((): void => {
		toast.success(`${label} copied to clipboard`, { position: 'bottom-left' });
	}, [label]);

	// Only a clamped value has anything to reveal, so only then is it worth
	// marking as hoverable.
	const valueText = (
		<Typography.Text
			ref={valueRef}
			size="small"
			weight="medium"
			truncate={1}
			interactive={isClamped}
			className={styles.value}
		>
			{value}
		</Typography.Text>
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
					{isClamped ? (
						<TooltipSimple title={value} arrow align="start">
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
