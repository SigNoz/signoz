import { ReactNode, useCallback } from 'react';
import { toast } from '@signozhq/ui/toast';
import { Tooltip } from '@signozhq/ui/tooltip';
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
			<Typography
				variant="uppercase"
				size="small"
				weight="medium"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				{label}
			</Typography>

			{renderedValue ?? (
				<div className={styles.valueRow}>
					<Tooltip title={value} side="bottom" align="start">
						<span className={styles.value}>
							<Typography
								variant="code"
								size="small"
								weight="medium"
								color="inherit"
								as="span"
								textOverflow="wrap"
							>
								{value}
							</Typography>
						</span>
					</Tooltip>
					{!!value && (
						<CopyButton
							value={value}
							size={10}
							ariaLabel={`Copy ${label}`}
							testId={`copy-metadata-${label.toLowerCase().replace(/\s+/g, '-')}`}
							onCopy={handleCopy}
						/>
					)}
				</div>
			)}
		</div>
	);
}
