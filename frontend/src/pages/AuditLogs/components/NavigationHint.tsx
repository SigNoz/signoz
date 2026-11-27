import { ArrowDown, ArrowUp } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from './NavigationHint.module.scss';

export function NavigationHint(): JSX.Element {
	return (
		<div className={styles.hint} data-testid="audit-log-detail-navigation-hint">
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				Use
			</Typography>
			<ArrowUp size={14} className={styles.icon} />
			<span>/</span>
			<ArrowDown size={14} className={styles.icon} />
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				to view previous/next log
			</Typography>
		</div>
	);
}
