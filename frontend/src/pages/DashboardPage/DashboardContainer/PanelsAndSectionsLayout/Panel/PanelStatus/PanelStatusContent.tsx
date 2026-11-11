import { BookOpenText, CircleX, TriangleAlert } from '@signozhq/icons';
import { Color } from '@signozhq/design-tokens';
import { Button } from '@signozhq/ui/button';

import type { PanelStatusDetail, PanelStatusVariant } from './types';
import styles from './PanelStatusPopover.module.scss';

interface PanelStatusContentProps {
	variant: PanelStatusVariant;
	detail: PanelStatusDetail;
}

const VARIANT_ICON = {
	error: { Icon: CircleX, color: Color.BG_CHERRY_500 },
	warning: { Icon: TriangleAlert, color: Color.BG_AMBER_500 },
};

/** Popover card for a panel status (error or warning). Pure presentation. */
function PanelStatusContent({
	variant,
	detail,
}: PanelStatusContentProps): JSX.Element {
	const { code, message, docsUrl, messages } = detail;
	const { Icon, color } = VARIANT_ICON[variant];

	return (
		<section className={styles.content} data-testid="panel-status-content">
			<header className={styles.summary}>
				<div className={styles.summaryLeft}>
					<span className={styles.iconWrapper}>
						<Icon size={16} color={color} />
					</span>
					<div className={styles.summaryText}>
						{code && <h2 className={styles.code}>{code}</h2>}
						<p className={styles.message}>{message}</p>
					</div>
				</div>
				{docsUrl && (
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						prefix={<BookOpenText size={14} />}
					>
						<a
							href={docsUrl}
							className={styles.docsLink}
							target="_blank"
							rel="noreferrer"
							data-testid="panel-status-docs"
						>
							Open Docs
						</a>
					</Button>
				)}
			</header>

			{messages.length > 0 && (
				<div className={styles.messageBadge}>
					<span className={styles.badge}>
						<span className={styles.badgeDot} />
						<span className={styles.badgeText}>MESSAGES</span>
						<span className={styles.badgeCount}>{messages.length}</span>
					</span>
					<span className={styles.badgeLine} />
				</div>
			)}

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
