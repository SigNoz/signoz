import { MouseEvent, useState } from 'react';

import AIMarkdown from './AIMarkdown';
import { MAX_TEXT_LENGTH } from './utils';

import styles from './AIThreadMessage.module.scss';

interface ExpandableTextProps {
	text: string;
}

function ExpandableText({ text }: ExpandableTextProps): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false);
	const isTruncated = !isExpanded && text.length > MAX_TEXT_LENGTH;
	const visibleText = isTruncated ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;

	const handleToggle = (event: MouseEvent): void => {
		event.stopPropagation();
		setIsExpanded((prev) => !prev);
	};

	return (
		<>
			<AIMarkdown className={styles.text} content={visibleText} />
			{text.length > MAX_TEXT_LENGTH && (
				<button
					type="button"
					className={styles.showMore}
					onClick={handleToggle}
					data-testid="ai-message-show-more"
				>
					{isExpanded ? 'Show less' : 'Show more'}
				</button>
			)}
		</>
	);
}

export default ExpandableText;
