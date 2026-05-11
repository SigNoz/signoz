import { Group } from 'lucide-react';

import styles from './EntityGroupHeader.module.scss';

interface EntityGroupHeaderProps {
	title: string;
	icon?: React.ReactNode;
}

function EntityGroupHeader({
	title,
	icon,
}: EntityGroupHeaderProps): JSX.Element {
	return (
		<div className={styles.entityGroupHeader}>
			{icon || <Group size={14} data-hide-expanded="true" />} {title}
		</div>
	);
}

export default EntityGroupHeader;
