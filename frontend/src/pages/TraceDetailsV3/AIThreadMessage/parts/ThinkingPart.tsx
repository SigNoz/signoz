import CollapsibleBlock from '../CollapsibleBlock';
import ExpandableText from '../ExpandableText';

import styles from '../AIThreadMessage.module.scss';

interface ThinkingPartProps {
	content?: string;
}

function ThinkingPart({ content }: ThinkingPartProps): JSX.Element {
	return (
		<CollapsibleBlock
			label="Thinking"
			isBoxed
			testId="ai-message-thinking-toggle"
		>
			{content ? (
				<ExpandableText text={content} isMarkdown />
			) : (
				<span className={styles.empty}>Reasoning content not captured</span>
			)}
		</CollapsibleBlock>
	);
}

ThinkingPart.defaultProps = {
	content: undefined,
};

export default ThinkingPart;
