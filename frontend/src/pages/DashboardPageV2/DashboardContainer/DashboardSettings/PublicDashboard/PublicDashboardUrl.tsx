import { Copy, ExternalLink } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from './PublicDashboard.module.scss';

interface PublicDashboardUrlProps {
	url: string;
	onCopy: () => void;
	onOpen: () => void;
}

function PublicDashboardUrl({
	url,
	onCopy,
	onOpen,
}: PublicDashboardUrlProps): JSX.Element {
	return (
		<div className={styles.urlGroup}>
			<Typography.Text className={styles.urlLabel}>
				Public dashboard URL
			</Typography.Text>

			<div className={styles.urlContainer}>
				<Typography.Text className={styles.urlText}>{url}</Typography.Text>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Copy public dashboard URL"
					testId="public-dashboard-copy-url"
					onClick={onCopy}
				>
					<Copy size={14} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Open public dashboard in new tab"
					testId="public-dashboard-open-url"
					onClick={onOpen}
				>
					<ExternalLink size={14} />
				</Button>
			</div>
		</div>
	);
}

export default PublicDashboardUrl;
