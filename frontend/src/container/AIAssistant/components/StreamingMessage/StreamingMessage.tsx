import React from 'react';
import cx from 'classnames';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type {
	ApprovalEventDTO,
	ClarificationEventDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import { useVariant } from '../../VariantContext';
import { StreamingEventItem } from '../../types';
import ApprovalCard from '../ApprovalCard';
import { RichCodeBlock } from '../blocks';
import ClarificationForm from '../ClarificationForm';
import ThinkingStep from '../ThinkingStep';
import ToolCallStep from '../ToolCallStep';

import messageStyles from '../MessageBubble/MessageBubble.module.scss';
import styles from './StreamingMessage.module.scss';

function SmartPre({ children }: { children?: React.ReactNode }): JSX.Element {
	const childArr = React.Children.toArray(children);
	if (childArr.length === 1) {
		const child = childArr[0];
		if (React.isValidElement(child) && child.type !== 'code') {
			return <>{child}</>;
		}
	}
	return <pre>{children}</pre>;
}

const MD_PLUGINS = [remarkGfm];
const MD_COMPONENTS = { code: RichCodeBlock, pre: SmartPre };

/** Human-readable labels for execution status codes shown before any events arrive. */
const STATUS_LABEL: Record<string, string> = {
	queued: 'Queued…',
	running: 'Thinking…',
	awaiting_approval: 'Waiting for your approval…',
	awaiting_clarification: 'Waiting for your input…',
	resumed: 'Resumed…',
};

function TypingDots(): JSX.Element {
	return (
		<span className={messageStyles.typingIndicator}>
			<span />
			<span />
			<span />
		</span>
	);
}

interface StreamingMessageProps {
	conversationId: string;
	/** Ordered timeline of text and tool-call events in arrival order. */
	events: StreamingEventItem[];
	status?: string;
	pendingApproval?: ApprovalEventDTO | null;
	pendingClarification?: ClarificationEventDTO | null;
}

export default function StreamingMessage({
	conversationId,
	events,
	status = '',
	pendingApproval = null,
	pendingClarification = null,
}: StreamingMessageProps): JSX.Element {
	const variant = useVariant();
	const isCompact = variant === 'panel';
	const statusLabel = STATUS_LABEL[status] ?? '';
	const isEmpty =
		events.length === 0 && !pendingApproval && !pendingClarification;
	const isWaitingOnUser = Boolean(pendingApproval || pendingClarification);

	const messageClass = cx(messageStyles.message, messageStyles.assistant, {
		[messageStyles.compact]: isCompact,
	});

	return (
		<div className={messageClass}>
			<div className={messageStyles.bubble}>
				{/* Pre-output indicator — only before any events arrive. */}
				{isEmpty && statusLabel && (
					<span className={styles.streamingStatus}>{statusLabel}</span>
				)}
				{isEmpty && !statusLabel && <TypingDots />}

				{/* eslint-disable react/no-array-index-key */}
				{/* Events rendered in arrival order: text, thinking, and tool calls interleaved */}
				{events.map((event, i) => {
					if (event.kind === 'tool') {
						return <ToolCallStep key={i} toolCall={event.toolCall} />;
					}
					if (event.kind === 'thinking') {
						return <ThinkingStep key={i} content={event.content} />;
					}
					return (
						<ReactMarkdown
							key={i}
							className={messageStyles.markdown}
							remarkPlugins={MD_PLUGINS}
							components={MD_COMPONENTS}
						>
							{event.content}
						</ReactMarkdown>
					);
				})}
				{/* eslint-enable react/no-array-index-key */}

				{/* While events are still streaming, append the typing dots so the
				    user has a clear "more is coming" signal. Hidden when the agent
				    is waiting on the user's input (an approval or clarification
				    card already conveys that state). */}
				{!isEmpty && !isWaitingOnUser && <TypingDots />}

				{/* Approval / clarification cards appended after any streamed text */}
				{pendingApproval && (
					<ApprovalCard conversationId={conversationId} approval={pendingApproval} />
				)}
				{pendingClarification && (
					<ClarificationForm
						conversationId={conversationId}
						clarification={pendingClarification}
					/>
				)}
			</div>
		</div>
	);
}
