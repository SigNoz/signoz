import cx from 'classnames';
import { Skeleton } from '@signozhq/ui/skeleton';

import { useVariant } from '../../VariantContext';

import styles from './ConversationSkeleton.module.scss';

/**
 * Each entry is one message in the placeholder thread:
 *   user:      a sent bubble, `width` as % of the row
 *   assistant: a reply, one width per line as % of the reply
 *
 * Mixed widths and varying line counts produce something that scans as a real
 * back-and-forth conversation rather than a uniform grid.
 */
const PATTERN: (
	| { role: 'user'; width: number }
	| { role: 'assistant'; lines: number[] }
)[] = [
	{ role: 'user', width: 42 },
	{ role: 'assistant', lines: [94, 88, 66] },
	{ role: 'user', width: 30 },
	{ role: 'assistant', lines: [90, 96, 84, 58] },
	{ role: 'user', width: 36 },
	{ role: 'assistant', lines: [86, 70] },
];

// Enough repeats to fill a tall pane down to the input; the thread clips the rest.
const ROWS = [...PATTERN, ...PATTERN, ...PATTERN, ...PATTERN];

/** Skeleton chat thread shown while a single conversation is being loaded. */
export default function ConversationSkeleton(): JSX.Element {
	const variant = useVariant();

	return (
		<div
			className={cx(styles.thread, {
				[styles.compact]: variant === 'panel',
				[styles.fullPage]: variant === 'page',
			})}
			aria-busy
			aria-label="Loading conversation"
		>
			{ROWS.map((row, idx) => (
				<div
					// eslint-disable-next-line react/no-array-index-key
					key={idx}
					className={cx(styles.message, { [styles.user]: row.role === 'user' })}
				>
					{row.role === 'user' ? (
						<div className={styles.userBubble} style={{ width: `${row.width}%` }}>
							<Skeleton.Input active className={styles.line} />
						</div>
					) : (
						<div className={styles.reply}>
							{row.lines.map((width, lineIdx) => (
								<Skeleton.Input
									// eslint-disable-next-line react/no-array-index-key
									key={lineIdx}
									active
									className={styles.line}
									style={{ width: `${width}%` }}
								/>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}
