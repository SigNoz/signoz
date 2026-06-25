import React, { useMemo } from 'react';
import cx from 'classnames';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Side-effect: registers all built-in block types into the BlockRegistry
import '../blocks';

import { useVariant } from '../../VariantContext';
import { Message, MessageBlock } from '../../types';
import ActionsSection from '../ActionsSection';
import ActivityGroup, { ActivityItem } from '../ActivityGroup';
import { RichCodeBlock } from '../blocks';
import MarkdownExternalLink from '../MarkdownExternalLink/MarkdownExternalLink';
import { MessageContext } from '../MessageContext';
import MessageFeedback from '../MessageFeedback';
import UserMessageActions from '../UserMessageActions';

import styles from './MessageBubble.module.scss';

/**
 * react-markdown renders fenced code blocks as <pre><code>...</code></pre>.
 * When RichCodeBlock replaces <code> with a custom AI block component, the
 * block ends up wrapped in <pre> which forces monospace font and white-space:pre.
 * This renderer detects that case and unwraps the <pre>.
 */
function SmartPre({ children }: { children?: React.ReactNode }): JSX.Element {
	const childArr = React.Children.toArray(children);
	if (childArr.length === 1) {
		const child = childArr[0];
		// If the code component returned something other than a <code> element
		// (i.e. a custom AI block), render without the <pre> wrapper.
		if (React.isValidElement(child) && child.type !== 'code') {
			return <>{child}</>;
		}
	}
	return <pre>{children}</pre>;
}

const MD_PLUGINS = [remarkGfm];
const MD_COMPONENTS = {
	code: RichCodeBlock,
	pre: SmartPre,
	a: MarkdownExternalLink,
};

type RenderGroup =
	| { kind: 'text'; id: string; content: string }
	| { kind: 'activity'; id: string; items: ActivityItem[] };

/**
 * Partition message blocks into render groups so consecutive thinking and
 * tool_call blocks collapse into a single ActivityGroup row. Text blocks
 * stand alone, mirroring the streaming view.
 */
function groupBlocks(blocks: MessageBlock[]): RenderGroup[] {
	const groups: RenderGroup[] = [];
	blocks.forEach((block, i) => {
		if (block.type === 'text') {
			groups.push({ kind: 'text', id: `text-${i}`, content: block.content });
			return;
		}
		const item: ActivityItem =
			block.type === 'thinking'
				? { id: `t-${i}`, kind: 'thinking', content: block.content }
				: {
						id: `c-${block.toolCallId}`,
						kind: 'tool',
						// Persisted blocks are always complete.
						toolCall: {
							toolName: block.toolName,
							input: block.toolInput,
							result: block.result,
							done: true,
							displayText: block.displayText,
						},
					};
		const last = groups[groups.length - 1];
		if (last?.kind === 'activity') {
			last.items.push(item);
		} else {
			groups.push({ kind: 'activity', id: `a-${i}`, items: [item] });
		}
	});
	return groups;
}

function renderGroup(group: RenderGroup): JSX.Element {
	if (group.kind === 'text') {
		return (
			<ReactMarkdown
				key={group.id}
				className={styles.markdown}
				remarkPlugins={MD_PLUGINS}
				components={MD_COMPONENTS}
			>
				{group.content}
			</ReactMarkdown>
		);
	}
	return <ActivityGroup key={group.id} items={group.items} />;
}

interface MessageBubbleProps {
	message: Message;
	onRegenerate?: () => void;
	isLastAssistant?: boolean;
}

export default function MessageBubble({
	message,
	onRegenerate,
	isLastAssistant = false,
}: MessageBubbleProps): JSX.Element {
	const variant = useVariant();
	const isCompact = variant === 'panel';
	const isUser = message.role === 'user';
	const hasBlocks = !isUser && message.blocks && message.blocks.length > 0;

	// Recompute groups only when the blocks array identity changes — store
	// updates that don't touch this message's blocks should not re-render the
	// underlying ThinkingStep/ToolCallStep children.
	const groups = useMemo(
		() => (hasBlocks ? groupBlocks(message.blocks!) : []),
		[hasBlocks, message.blocks],
	);

	const messageClass = cx(
		styles.message,
		isUser ? styles.user : styles.assistant,
		{
			[styles.compact]: isCompact,
		},
	);
	const bodyClass = cx(styles.body, { [styles.compact]: isCompact });

	return (
		<div className={messageClass} data-testid={`ai-message-${message.id}`}>
			<div className={bodyClass}>
				<div className={styles.bubbleRow}>
					<div className={styles.bubble}>
						{message.attachments && message.attachments.length > 0 && (
							<div className={styles.attachments}>
								{message.attachments.map((att) => {
									const isImage = att.type.startsWith('image/');
									return isImage ? (
										<img
											key={att.name}
											src={att.dataUrl}
											alt={att.name}
											className={styles.attachmentImage}
										/>
									) : (
										<div key={att.name} className={styles.attachmentFile}>
											{att.name}
										</div>
									);
								})}
							</div>
						)}

						{isUser ? (
							<p className={styles.text}>{message.content}</p>
						) : hasBlocks ? (
							<MessageContext.Provider value={{ messageId: message.id }}>
								{groups.map((g) => renderGroup(g))}
							</MessageContext.Provider>
						) : (
							<MessageContext.Provider value={{ messageId: message.id }}>
								<ReactMarkdown
									className={styles.markdown}
									remarkPlugins={MD_PLUGINS}
									components={MD_COMPONENTS}
								>
									{message.content}
								</ReactMarkdown>
							</MessageContext.Provider>
						)}

						{!isUser && message.actions && message.actions.length > 0 && (
							<ActionsSection actions={message.actions} messageId={message.id} />
						)}
					</div>
				</div>

				{!isUser && !message.isRateLimitError && (
					<MessageFeedback
						message={message}
						onRegenerate={onRegenerate}
						isLastAssistant={isLastAssistant}
					/>
				)}

				{isUser && <UserMessageActions message={message} />}
			</div>
		</div>
	);
}
