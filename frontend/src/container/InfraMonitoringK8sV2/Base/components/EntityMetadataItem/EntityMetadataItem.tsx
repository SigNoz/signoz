import { ReactNode, useCallback, useRef } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Copy } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';

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
	const [, copyToClipboard] = useCopyToClipboard();

	const testId = label.toLowerCase().replace(/\s+/g, '-');

	const handleCopy = useCallback((): void => {
		copyToClipboard(value);
		toast.success(`${label} copied to clipboard`, { position: 'bottom-left' });
	}, [copyToClipboard, label, value]);

	const valueText = (
		<Typography.Text
			ref={valueRef}
			size="small"
			weight="medium"
			truncate={1}
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
						<TooltipSimple title={`Copy ${label}`}>
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								className={styles.copyButton}
								onClick={handleCopy}
								data-testid={`copy-metadata-${testId}`}
								prefix={<Copy size={12} />}
							/>
						</TooltipSimple>
					)}
				</div>
			)}
		</div>
	);
}
