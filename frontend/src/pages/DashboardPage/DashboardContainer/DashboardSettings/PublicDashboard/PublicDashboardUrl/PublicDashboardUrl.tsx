import { Copy, ExternalLink, Link2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from './PublicDashboardUrl.module.scss';

interface PublicDashboardUrlProps {
	isPublic: boolean;
	url: string;
	onCopy: () => void;
	onOpen: () => void;
}

function PublicDashboardUrl({
	isPublic,
	url,
	onCopy,
	onOpen,
}: PublicDashboardUrlProps): JSX.Element {
	return (
		<div className={styles.fieldGroup}>
			<Typography.Text className={styles.fieldLabel}>Public link</Typography.Text>

			{isPublic ? (
				<div className={styles.linkField}>
					<Typography.Text className={styles.linkUrl}>{url}</Typography.Text>
					<span className={styles.linkDivider} />
					<Button
						variant="ghost"
						size="icon"
						aria-label="Copy link"
						testId="public-dashboard-copy-url"
						onClick={onCopy}
					>
						<Copy size={15} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Open link"
						testId="public-dashboard-open-url"
						onClick={onOpen}
					>
						<ExternalLink size={15} />
					</Button>
				</div>
			) : (
				<div className={styles.linkPlaceholder}>
					<Link2 size={15} className={styles.linkPlaceholderIcon} />
					<Typography.Text className={styles.linkPlaceholderText}>
						Your shareable link will appear here once published
					</Typography.Text>
				</div>
			)}
		</div>
	);
}

export default PublicDashboardUrl;
