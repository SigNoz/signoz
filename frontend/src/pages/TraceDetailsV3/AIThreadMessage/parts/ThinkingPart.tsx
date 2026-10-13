import CollapsibleBlock from '../CollapsibleBlock';
import ExpandableText from '../ExpandableText';

import styles from '../AIThreadMessage.module.scss';

interface ThinkingPartProps {
	content?: string;
	label?: string;
	testId?: string;
}

function ThinkingPart({
	content,
	label = 'Thinking',
	testId = 'ai-message-thinking-toggle',
}: ThinkingPartProps): JSX.Element {
	return (
		<CollapsibleBlock label={label} isBoxed testId={testId}>
			{content ? (
				<ExpandableText text={content} isMarkdown />
			) : (
				<span className={styles.empty}>Content not captured</span>
			)}
		</CollapsibleBlock>
	);
}

ThinkingPart.defaultProps = {
	content: undefined,
	label: 'Thinking',
	testId: 'ai-message-thinking-toggle',
};

export default ThinkingPart;
