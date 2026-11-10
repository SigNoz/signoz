import { useMemo } from 'react';

import ExpandableText from './ExpandableText';
import JsonBlock from './JsonBlock';
import { parseJsonObject } from './utils';

import styles from './AIThreadMessage.module.scss';

interface TextContentProps {
	text: string;
}

/** Renders JSON text as a tree, anything else as markdown. */
function TextContent({ text }: TextContentProps): JSX.Element {
	const json = useMemo(() => parseJsonObject(text), [text]);

	if (json) {
		return <JsonBlock data={json} />;
	}
	return (
		<div className={styles.textBox}>
			<ExpandableText text={text} />
		</div>
	);
}

export default TextContent;
