import { useMemo } from 'react';

import ExpandableText from './ExpandableText';
import JsonBlock from './JsonBlock';
import { parseJsonObject } from './utils';

import styles from './AIThreadMessage.module.scss';

interface TextContentProps {
	text: string;
	isMarkdown?: boolean;
}

/** Renders JSON text as a tree, anything else as (markdown) text. */
function TextContent({
	text,
	isMarkdown = false,
}: TextContentProps): JSX.Element {
	const json = useMemo(() => parseJsonObject(text), [text]);

	if (json) {
		return <JsonBlock data={json} />;
	}
	return (
		<div className={styles.textBox}>
			<ExpandableText text={text} isMarkdown={isMarkdown} />
		</div>
	);
}

TextContent.defaultProps = {
	isMarkdown: false,
};

export default TextContent;
