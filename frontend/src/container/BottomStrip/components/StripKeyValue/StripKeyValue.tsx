import type { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './StripKeyValue.module.scss';

/** The semantic colours the strip allows an icon to take. */
export type StripTone = 'default' | 'warning' | 'error';

export interface StripKeyValueProps {
	label: string;
	/** A string or number so a consumer cannot smuggle a node in as the value. */
	value: string | number;
	/** Leading icon, sized and aligned for you. Same shape as `Button`'s. */
	prefix?: ReactNode;
	/** Tints the icon only; the text stays neutral at every tone. */
	tone?: StripTone;
}

/**
 * A labelled number, rendered `Spans : 31`. The strip owns the separator and the
 * spacing around it so no consumer has to build the string.
 */
function StripKeyValue({
	label,
	value,
	prefix,
	tone,
}: StripKeyValueProps): JSX.Element {
	return (
		<span className={styles.keyValue}>
			{prefix && (
				<span className={cx(styles.prefix, tone && styles[tone])} data-tone={tone}>
					{prefix}
				</span>
			)}
			<Typography.Text as="span" className={styles.label}>
				{label}
			</Typography.Text>
			<Typography.Text as="span" className={styles.colon}>
				:
			</Typography.Text>
			<Typography.Text as="span" className={styles.value}>
				{value}
			</Typography.Text>
		</span>
	);
}

StripKeyValue.defaultProps = { prefix: undefined, tone: 'default' };

export default StripKeyValue;
