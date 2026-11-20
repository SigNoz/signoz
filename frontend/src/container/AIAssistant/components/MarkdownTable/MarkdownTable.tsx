import type { ComponentProps } from 'react';

import styles from './MarkdownTable.module.scss';

type MarkdownTableProps = ComponentProps<'table'> & {
	// react-markdown passes `node` — accept and ignore it
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	node?: any;
};

/** A reply's table in its panel, which scrolls sideways when the table is wider than the reply. */
export default function MarkdownTable({
	node: _node,
	...props
}: MarkdownTableProps): JSX.Element {
	return (
		<div className={styles.panel}>
			<table {...props} />
		</div>
	);
}
