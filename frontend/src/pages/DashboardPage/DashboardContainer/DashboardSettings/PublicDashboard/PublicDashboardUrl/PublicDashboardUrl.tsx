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
			<Typography
				variant="label"
				size="small"
				weight="medium"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				Public link
			</Typography>

			{isPublic ? (
				<div className={styles.linkField}>
					<span className={styles.linkUrl}>
						<Typography
							variant="code"
							size="base"
							weight="regular"
							color="secondary"
							as="span"
							display="block"
							textOverflow="ellipsis"
						>
							{url}
						</Typography>
					</span>
					<span className={styles.linkDivider} />
					<Button
						color="secondary"
						variant="ghost"
						size="sm"
						icon
						aria-label="Copy link"
						testId="public-dashboard-copy-url"
						onClick={onCopy}
					>
						<Copy size={15} />
					</Button>
					<Button
						color="secondary"
						variant="ghost"
						size="sm"
						icon
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
					<Typography
						variant="label"
						size="base"
						weight="regular"
						color="tertiary"
						as="span"
						textOverflow="wrap"
					>
						Your shareable link will appear here once published
					</Typography>
				</div>
			)}
		</div>
	);
}

export default PublicDashboardUrl;
