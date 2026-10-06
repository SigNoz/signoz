import { ReactNode } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';

import styles from './EntityMetadataItem.module.scss';

interface EntityMetadataItemProps {
	tooltip: ReactNode;
	tooltipClassName?: string;
	icon?: ReactNode;
	children: ReactNode;
}

function EntityMetadataItem({
	tooltip,
	tooltipClassName,
	icon,
	children,
}: EntityMetadataItemProps): JSX.Element {
	return (
		<TooltipSimple
			title={tooltip}
			tooltipContentProps={{ className: tooltipClassName }}
		>
			<span className={styles.item}>
				{icon}
				<Typography.Text as="span">{children}</Typography.Text>
			</span>
		</TooltipSimple>
	);
}

EntityMetadataItem.defaultProps = {
	icon: null,
	tooltipClassName: undefined,
};

export default EntityMetadataItem;
