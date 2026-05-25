import { useCallback, useEffect, useMemo, useState } from 'react';
import cx from 'classnames';
import { useCopyToClipboard } from 'react-use';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp } from '@signozhq/icons';
import { useTimezone } from 'providers/Timezone';

import logEvent from 'api/common/logEvent';

import { FeedbackRatingDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { AIAssistantEvents } from '../../events';
import { useAIAssistantAnalyticsContext } from '../../hooks/useAIAssistantAnalyticsContext';
import { useAIAssistantStore } from '../../store/useAIAssistantStore';
import { FeedbackRating, Message } from '../../types';

import styles from './MessageFeedback.module.scss';

const FEEDBACK_ANALYTICS_RATING = {
	[FeedbackRatingDTO.positive]: 'up',
	[FeedbackRatingDTO.negative]: 'down',
} as const;

const VOTE_LABEL = {
	[FeedbackRatingDTO.positive]: {
		tooltip: 'Good response',
		ariaLabel: 'Good response',
	},
	[FeedbackRatingDTO.negative]: {
		tooltip: 'Bad response',
		ariaLabel: 'Bad response',
	},
} as const;

interface MessageFeedbackProps {
	message: Message;
	onRegenerate?: () => void;
	isLastAssistant?: boolean;
}

function formatRelativeTime(timestamp: number): string {
	const diffMs = Date.now() - timestamp;
	const diffSec = Math.floor(diffMs / 1000);

	if (diffSec < 10) {
		return 'just now';
	}
	if (diffSec < 60) {
		return `${diffSec}s ago`;
	}

	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) {
		return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
	}

	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) {
		return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`;
	}

	const diffDay = Math.floor(diffHr / 24);
	return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

export default function MessageFeedback({
	message,
	onRegenerate,
	isLastAssistant = false,
}: MessageFeedbackProps): JSX.Element {
	const [copied, setCopied] = useState(false);
	const [, copyToClipboard] = useCopyToClipboard();
	const submitMessageFeedback = useAIAssistantStore(
		(s) => s.submitMessageFeedback,
	);
	const { threadId } = useAIAssistantAnalyticsContext();

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	// Local vote state — initialised from persisted feedbackRating, updated
	// immediately on click so the UI responds without waiting for the API.
	const [vote, setVote] = useState<FeedbackRating | null>(
		message.feedbackRating ?? null,
	);

	// Negative-feedback dialog: collects an optional comment from the user.
	// Positive feedback is one-click; negative requires explicit Submit so
	// users can describe what was wrong.
	const [isNegativeDialogOpen, setIsNegativeDialogOpen] = useState(false);
	const [negativeComment, setNegativeComment] = useState('');

	const [relativeTime, setRelativeTime] = useState(() =>
		formatRelativeTime(message.createdAt),
	);

	const absoluteTime = useMemo(
		() =>
			formatTimezoneAdjustedTimestamp(
				message.createdAt,
				DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS,
			),
		[message.createdAt, formatTimezoneAdjustedTimestamp],
	);

	// Tick relative time every 30 s
	useEffect(() => {
		const id = setInterval(() => {
			setRelativeTime(formatRelativeTime(message.createdAt));
		}, 30_000);
		return (): void => clearInterval(id);
	}, [message.createdAt]);

	const handleCopy = useCallback((): void => {
		void logEvent(AIAssistantEvents.MessageCopied, {
			role: message.role,
			messageId: message.id,
			hadToolCalls: Boolean(message.blocks?.some((b) => b.type === 'tool_call')),
		});
		copyToClipboard(message.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}, [
		copyToClipboard,
		message.content,
		message.id,
		message.role,
		message.blocks,
	]);

	const handleVote = useCallback(
		(rating: FeedbackRating): void => {
			if (vote === rating) {
				return;
			}
			if (rating === FeedbackRatingDTO.negative) {
				setNegativeComment('');
				setIsNegativeDialogOpen(true);
				return;
			}
			setVote(rating);
			void logEvent(AIAssistantEvents.FeedbackSubmitted, {
				messageId: message.id,
				threadId,
				rating: FEEDBACK_ANALYTICS_RATING[rating],
				hasComment: false,
				commentLength: 0,
			});
			submitMessageFeedback(message.id, rating);
		},
		[vote, message.id, submitMessageFeedback, threadId],
	);

	const handleSubmitNegative = useCallback((): void => {
		setVote(FeedbackRatingDTO.negative);
		setIsNegativeDialogOpen(false);
		const trimmed = negativeComment.trim();
		void logEvent(AIAssistantEvents.FeedbackSubmitted, {
			messageId: message.id,
			threadId,
			rating: FEEDBACK_ANALYTICS_RATING[FeedbackRatingDTO.negative],
			hasComment: trimmed.length > 0,
			commentLength: trimmed.length,
		});
		submitMessageFeedback(
			message.id,
			FeedbackRatingDTO.negative,
			trimmed || undefined,
		);
	}, [message.id, negativeComment, submitMessageFeedback, threadId]);

	return (
		<>
			<div className={cx(styles.feedback, { [styles.visible]: isLastAssistant })}>
				<div className={styles.actions}>
					<TooltipSimple title={copied ? 'Copied!' : 'Copy'}>
						<Button
							className={styles.btn}
							size="icon"
							variant="ghost"
							onClick={handleCopy}
							color="secondary"
							aria-label={copied ? 'Copied' : 'Copy message'}
						>
							{copied ? <Check size={12} /> : <Copy size={12} />}
						</Button>
					</TooltipSimple>

					<TooltipSimple title={VOTE_LABEL[FeedbackRatingDTO.positive].tooltip}>
						<Button
							className={cx(styles.btn, {
								[styles.votedUp]: vote === FeedbackRatingDTO.positive,
							})}
							size="icon"
							variant="ghost"
							color="secondary"
							onClick={(): void => handleVote(FeedbackRatingDTO.positive)}
							aria-label={VOTE_LABEL[FeedbackRatingDTO.positive].ariaLabel}
							aria-pressed={vote === FeedbackRatingDTO.positive}
						>
							<ThumbsUp size={12} />
						</Button>
					</TooltipSimple>

					<TooltipSimple title={VOTE_LABEL[FeedbackRatingDTO.negative].tooltip}>
						<Button
							className={cx(styles.btn, {
								[styles.votedDown]: vote === FeedbackRatingDTO.negative,
							})}
							size="icon"
							variant="ghost"
							color="secondary"
							onClick={(): void => handleVote(FeedbackRatingDTO.negative)}
							aria-label={VOTE_LABEL[FeedbackRatingDTO.negative].ariaLabel}
							aria-pressed={vote === FeedbackRatingDTO.negative}
						>
							<ThumbsDown size={12} />
						</Button>
					</TooltipSimple>

					{onRegenerate && (
						<TooltipSimple title="Regenerate">
							<Button
								className={styles.btn}
								size="icon"
								variant="ghost"
								color="secondary"
								onClick={onRegenerate}
								aria-label="Regenerate response"
							>
								<RefreshCw size={12} />
							</Button>
						</TooltipSimple>
					)}
				</div>

				<span className={styles.time}>
					{relativeTime} · {absoluteTime}
				</span>
			</div>

			<DialogWrapper
				open={isNegativeDialogOpen}
				onOpenChange={setIsNegativeDialogOpen}
				title="What went wrong?"
				subTitle="Your feedback helps us improve the assistant. Comments are optional."
				width="base"
				footer={
					<div className={styles.feedbackDialogFooter}>
						<Button
							variant="solid"
							color="secondary"
							onClick={(): void => setIsNegativeDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button variant="solid" color="primary" onClick={handleSubmitNegative}>
							Send feedback
						</Button>
					</div>
				}
			>
				<textarea
					className={styles.feedbackTextarea}
					placeholder="Tell us what was unhelpful, inaccurate, or unsafe…"
					value={negativeComment}
					onChange={(e): void => setNegativeComment(e.target.value)}
					rows={5}
					autoFocus
					maxLength={2000}
				/>
			</DialogWrapper>
		</>
	);
}
