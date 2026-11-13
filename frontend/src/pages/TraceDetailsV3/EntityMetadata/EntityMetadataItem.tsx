import { ReactNode } from 'react';
import { Tooltip, TooltipProps } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';

import styles from './EntityMetadataItem.module.scss';

interface EntityMetadataItemProps {
	tooltip: TooltipProps['title'];
	icon?: ReactNode;
	children: ReactNode;
}

function EntityMetadataItem({
	tooltip,
	icon,
	children,
}: EntityMetadataItemProps): JSX.Element {
	return (
		// Below the row: above it the tooltip covers the Overview / Thread tabs.
		<Tooltip title={tooltip} side="bottom">
			<span className={styles.item}>
				{icon}
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					{children}
				</Typography>
			</span>
		</Tooltip>
	);
}

EntityMetadataItem.defaultProps = {
	icon: null,
};

export default EntityMetadataItem;
