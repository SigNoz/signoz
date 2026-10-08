import { MouseEvent, useState } from 'react';
import cx from 'classnames';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import { MAX_TEXT_LENGTH } from './utils';

import styles from './AIThreadMessage.module.scss';

interface ExpandableTextProps {
	text: string;
	isMarkdown?: boolean;
}

function ExpandableText({
	text,
	isMarkdown = false,
}: ExpandableTextProps): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false);
	const isTruncated = !isExpanded && text.length > MAX_TEXT_LENGTH;
	const visibleText = isTruncated ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;

	const handleToggle = (event: MouseEvent): void => {
		event.stopPropagation();
		setIsExpanded((prev) => !prev);
	};

	return (
		<>
			{isMarkdown ? (
				<MarkdownRenderer
					className={styles.text}
					markdownContent={visibleText}
					variables={{}}
				/>
			) : (
				<div className={cx(styles.text, styles.plainText)}>{visibleText}</div>
			)}
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

ExpandableText.defaultProps = {
	isMarkdown: false,
};

export default ExpandableText;
