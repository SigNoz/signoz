import CollapsibleBlock from '../CollapsibleBlock';
import TextContent from '../TextContent';

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
				<TextContent text={content} />
			) : (
				<span className={styles.empty}> - </span>
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
