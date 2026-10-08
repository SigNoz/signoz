import { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';

import TraceTooltip from '../TraceTooltip/TraceTooltip';

import styles from './EntityMetadataItem.module.scss';

interface EntityMetadataItemProps {
	tooltip: ReactNode;
	icon?: ReactNode;
	children: ReactNode;
}

function EntityMetadataItem({
	tooltip,
	icon,
	children,
}: EntityMetadataItemProps): JSX.Element {
	return (
		<TraceTooltip title={tooltip}>
			<span className={styles.item}>
				{icon}
				<Typography.Text as="span">{children}</Typography.Text>
			</span>
		</TraceTooltip>
	);
}

EntityMetadataItem.defaultProps = {
	icon: null,
};

export default EntityMetadataItem;
