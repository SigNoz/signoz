import { BookOpenText } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import type { PanelStatusDetail } from './types';
import styles from './PanelStatusPopover.module.scss';

interface PanelStatusContentProps {
	detail: PanelStatusDetail;
}

/**
 * Popover body for a panel status (error or warning): a code + summary header
 * with an optional docs link, followed by any per-item messages. Pure
 * presentation — the variant's icon/colour is owned by `PanelStatusPopover`.
 */
function PanelStatusContent({ detail }: PanelStatusContentProps): JSX.Element {
	const { code, message, docsUrl, messages } = detail;

	return (
		<section className={styles.content} data-testid="panel-status-content">
			<header className={styles.summary}>
				<div className={styles.summaryText}>
					<h2 className={styles.code}>{code}</h2>
					<p className={styles.message}>{message}</p>
				</div>
				{docsUrl && (
					<Typography.Link
						className={styles.docsLink}
						href={docsUrl}
						target="_blank"
						rel="noreferrer"
						data-testid="panel-status-docs"
					>
						<BookOpenText size={14} />
						Open Docs
					</Typography.Link>
				)}
			</header>
			{messages.length > 0 && (
				<ul className={styles.messageList}>
					{messages.map((m) => (
						<li key={m} className={styles.messageItem}>
							{m}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

export default PanelStatusContent;
