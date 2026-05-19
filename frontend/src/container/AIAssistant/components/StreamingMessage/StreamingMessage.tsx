import React, { useMemo } from 'react';
import cx from 'classnames';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type {
	ApprovalEventDTO,
	ClarificationEventDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import { useVariant } from '../../VariantContext';
import { StreamingEventItem } from '../../types';
import ActivityGroup, { ActivityItem } from '../ActivityGroup';
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

type RenderGroup =
	| { kind: 'text'; content: string }
	| { kind: 'activity'; items: ActivityItem[]; isTrailing: boolean };

/**
 * Partition the streaming event timeline into render groups: runs of
 * consecutive thinking/tool events fold into a single activity group, text
 * events stay standalone. The last group is flagged as trailing so the
 * caller can drive a "live" indicator on it.
 *
 * Invariant relied on by the ActivityGroup elapsed-time timer: once a
 * group exists at a given array index, later events only extend its
 * `items` — they never shrink the array or re-key existing groups. That
 * keeps each ActivityGroup React instance stable across re-renders so the
 * timer's `wasLive` → `isLive` re-stamp captures the right transition.
 */
function groupStreamingEvents(events: StreamingEventItem[]): RenderGroup[] {
	const groups: RenderGroup[] = [];
	for (const event of events) {
		if (event.kind === 'text') {
			groups.push({ kind: 'text', content: event.content });
			continue;
		}
		const item: ActivityItem =
			event.kind === 'thinking'
				? { kind: 'thinking', content: event.content }
				: { kind: 'tool', toolCall: event.toolCall };
		const last = groups[groups.length - 1];
		if (last?.kind === 'activity') {
			last.items.push(item);
		} else {
			groups.push({ kind: 'activity', items: [item], isTrailing: false });
		}
	}
	const last = groups[groups.length - 1];
	if (last?.kind === 'activity') {
		last.isTrailing = true;
	}
	return groups;
}

/**
 * Renders a single activity item bare — used when an activity group has
 * only one item, so the user doesn't see a "Worked through 1 step" wrapper
 * around a single chevron row.
 */
function renderBareActivity(
	item: ActivityItem,
	index: number,
	isLive: boolean,
): JSX.Element {
	if (item.kind === 'thinking') {
		return <ThinkingStep key={index} content={item.content} isLive={isLive} />;
	}
	return <ToolCallStep key={index} toolCall={item.toolCall} />;
}

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

	// Recompute groups only when the events array identity changes. The
	// streaming reducer pushes new entries into the same array reference
	// once per tick, so this naturally invalidates as events arrive.
	const groups = useMemo(() => groupStreamingEvents(events), [events]);

	return (
		<div className={messageClass}>
			<div className={messageStyles.bubble}>
				{/* Pre-output indicator — only before any events arrive. */}
				{isEmpty && statusLabel && (
					<span className={styles.streamingStatus}>{statusLabel}</span>
				)}
				{isEmpty && !statusLabel && <TypingDots />}

				{/* eslint-disable react/no-array-index-key */}
				{/* Runs of consecutive thinking + tool events collapse into a
				    single ActivityGroup; text events render inline between
				    them. The trailing group is "live" while streaming is
				    active and not blocked on the user. */}
				{groups.map((group, i) => {
					if (group.kind === 'text') {
						return (
							<ReactMarkdown
								key={i}
								className={messageStyles.markdown}
								remarkPlugins={MD_PLUGINS}
								components={MD_COMPONENTS}
							>
								{group.content}
							</ReactMarkdown>
						);
					}
					const groupIsLive = group.isTrailing && !isWaitingOnUser;
					// Bare-render a lone activity item — the chevron on the
					// underlying step is enough disclosure without wrapping it in
					// a "Worked through 1 step" summary row.
					if (group.items.length === 1) {
						return renderBareActivity(group.items[0], i, groupIsLive);
					}
					return <ActivityGroup key={i} items={group.items} isLive={groupIsLive} />;
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
