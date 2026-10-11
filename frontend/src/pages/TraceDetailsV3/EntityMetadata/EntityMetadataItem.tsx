import { ReactNode } from 'react';
import { TooltipSimple, TooltipSimpleProps } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';

import styles from './EntityMetadataItem.module.scss';

interface EntityMetadataItemProps {
	tooltip: TooltipSimpleProps['title'];
	icon?: ReactNode;
	children: ReactNode;
}

function EntityMetadataItem({
	tooltip,
	icon,
	children,
}: EntityMetadataItemProps): JSX.Element {
	return (
		<TooltipSimple
			title={tooltip}
			tooltipContentProps={{ className: styles.tooltip }}
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
};

export default EntityMetadataItem;
