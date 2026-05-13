import cx from 'classnames';

import { useVariant } from '../../VariantContext';

import styles from './ConversationSkeleton.module.scss';

/**
 * Each entry is one bubble in the placeholder thread:
 *   role:  who "sent" the bubble — drives left/right alignment + colour
 *   lines: list of widths (as % of the bubble) for the shimmer lines inside
 *
 * Mixed widths and varying line counts produce something that scans as a real
 * back-and-forth conversation rather than a uniform grid.
 */
const ROWS: { role: 'user' | 'assistant'; lines: number[] }[] = [
	{ role: 'user', lines: [62] },
	{ role: 'assistant', lines: [85, 92, 70] },
	{ role: 'user', lines: [55, 40] },
	{ role: 'assistant', lines: [90, 78, 95, 60] },
	{ role: 'user', lines: [48] },
	{ role: 'assistant', lines: [80, 88] },
];

/** Skeleton chat thread shown while a single conversation is being loaded. */
export default function ConversationSkeleton(): JSX.Element {
	const variant = useVariant();
	const isCompact = variant === 'panel';

	return (
		<div className={styles.thread} aria-busy aria-label="Loading conversation">
			{ROWS.map((row, idx) => (
				<div
					// eslint-disable-next-line react/no-array-index-key
					key={idx}
					className={cx(styles.message, styles[row.role], {
						[styles.compact]: isCompact,
					})}
				>
					<div className={cx(styles.bubble, styles[row.role])}>
						{row.lines.map((width, lineIdx) => (
							<div
								// eslint-disable-next-line react/no-array-index-key
								key={lineIdx}
								className={styles.line}
								style={{ width: `${width}%` }}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
