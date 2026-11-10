import type { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import { StripTone } from '../../types';

import styles from './StripKeyValue.module.scss';

export interface StripKeyValueProps {
	label: string;
	value: string | number;
	/** Leading icon. Same shape as `Button`'s. */
	prefix?: ReactNode;
	/** Tints the icon; the text stays neutral at every tone. */
	tone?: StripTone;
}

/** A labelled number, rendered `Spans : 31`. */
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

StripKeyValue.defaultProps = { prefix: undefined, tone: StripTone.Default };

export default StripKeyValue;
