import { ArrowRight } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { openInNewTab } from 'utils/navigation';

import styles from './AlertsEmptyState.module.scss';

interface AlertInfoCardProps {
	header: string;
	subheader: string;
	link: string;
	onClick: () => void;
}

function AlertInfoCard({
	header,
	subheader,
	link,
	onClick,
}: AlertInfoCardProps): JSX.Element {
	return (
		<div
			className={styles.alertInfoCard}
			onClick={(): void => {
				onClick();
				openInNewTab(link);
			}}
		>
			<div className={styles.alertCardText}>
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="main"
					as="span"
					textOverflow="wrap"
				>
					{header}
				</Typography>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					{subheader}
				</Typography>
			</div>
			<ArrowRight size="md" />
		</div>
	);
}

export default AlertInfoCard;
