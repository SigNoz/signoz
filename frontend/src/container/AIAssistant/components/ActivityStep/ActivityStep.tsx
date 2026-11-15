import type { ReactNode } from 'react';
import cx from 'classnames';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import styles from './ActivityStep.module.scss';

interface ActivityStepProps {
	title: string;
	/** Still running: the title shimmers. */
	isLive?: boolean;
	/** Given only for steps whose detail opens on demand. */
	onToggle?: () => void;
	expanded?: boolean;
	children?: ReactNode;
}

/** One step of the agent's work on a timeline: a dot, its title, and what it did. */
export default function ActivityStep({
	title,
	isLive = false,
	onToggle,
	expanded = false,
	children,
}: ActivityStepProps): JSX.Element {
	const titleText = <span className={styles.titleText}>{title}</span>;

	return (
		<div
			className={cx(styles.step, { [styles.live]: isLive })}
			data-testid="ai-activity-step"
		>
			<div className={styles.rail}>
				<span className={styles.dot} />
			</div>
			<div className={styles.content}>
				{onToggle ? (
					<button
						type="button"
						className={styles.title}
						onClick={onToggle}
						aria-expanded={expanded}
						data-testid="ai-activity-step-toggle"
					>
						{titleText}
						{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
					</button>
				) : (
					<span className={styles.title}>{titleText}</span>
				)}
				{children && <div className={styles.detail}>{children}</div>}
			</div>
		</div>
	);
}
