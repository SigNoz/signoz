import type { ReactElement, ReactNode } from 'react';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './PanelMessage.module.scss';

export interface PanelMessageAction {
	label: string;
	onClick: () => void;
	/** Optional leading icon for the action button. */
	icon?: ReactElement;
}

interface PanelMessageProps {
	/** Glyph shown above the title — sets the state's visual identity. */
	icon: ReactNode;
	title: string;
	/** Secondary line explaining the state / suggesting a next step. */
	description?: string;
	/** Optional call-to-action (e.g. Retry). Omitted → no button. */
	action?: PanelMessageAction;
	/** `danger` tints the icon for failure states; `neutral` for empty states. */
	tone?: 'neutral' | 'danger';
	'data-testid'?: string;
}

/**
 * Shared centred panel state (icon + title + optional description/action) so the
 * no-query / no-data / error states stay visually consistent across call sites.
 */
function PanelMessage({
	icon,
	title,
	description,
	action,
	tone = 'neutral',
	'data-testid': testId,
}: PanelMessageProps): JSX.Element {
	return (
		<div className={styles.message} data-testid={testId}>
			<div className={cx(styles.icon, { [styles.iconDanger]: tone === 'danger' })}>
				{icon}
			</div>
			<Typography.Text className={styles.title}>{title}</Typography.Text>
			{description && (
				<Typography.Text className={styles.description}>
					{description}
				</Typography.Text>
			)}
			{action && (
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					prefix={action.icon}
					onClick={action.onClick}
					className={styles.action}
					data-testid={testId ? `${testId}-action` : undefined}
				>
					{action.label}
				</Button>
			)}
		</div>
	);
}

export default PanelMessage;
