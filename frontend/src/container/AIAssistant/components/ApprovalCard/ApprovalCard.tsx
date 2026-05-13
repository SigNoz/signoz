import { useEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import {
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogHeader,
	DialogSubtitle,
	DialogTitle,
} from '@signozhq/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';
import type {
	ApprovalEventDTO,
	ApprovalEventDTODiff,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import {
	Check,
	Columns2,
	Copy,
	List,
	Maximize2,
	Shield,
	WrapText,
	X,
} from '@signozhq/icons';

import { useAIAssistantStore } from '../../store/useAIAssistantStore';

import styles from './ApprovalCard.module.scss';

interface ApprovalCardProps {
	conversationId: string;
	approval: ApprovalEventDTO;
}

/**
 * Rendered when the agent emits an `approval` SSE event.
 * The agent has paused execution; the user must approve or reject
 * before the stream resumes on a new execution.
 */
export default function ApprovalCard({
	conversationId,
	approval,
}: ApprovalCardProps): JSX.Element {
	const approveAction = useAIAssistantStore((s) => s.approveAction);
	const rejectAction = useAIAssistantStore((s) => s.rejectAction);
	const isStreaming = useAIAssistantStore(
		(s) => s.streams[conversationId]?.isStreaming ?? false,
	);

	const [decided, setDecided] = useState<'approved' | 'rejected' | null>(null);
	const [diffExpanded, setDiffExpanded] = useState(false);
	const [wrapText, setWrapText] = useState(false);
	const [viewMode, setViewMode] = useState<DiffViewMode>('split');

	const handleApprove = async (): Promise<void> => {
		setDecided('approved');
		await approveAction(conversationId, approval.approvalId);
	};

	const handleReject = async (): Promise<void> => {
		setDecided('rejected');
		await rejectAction(conversationId, approval.approvalId);
	};

	// After decision the card shows a compact confirmation row
	if (decided === 'approved') {
		return (
			<div className={cx(styles.card, styles.decided)}>
				<Check size={13} className={cx(styles.statusIcon, styles.ok)} />
				<span className={styles.statusText}>Approved — resuming…</span>
			</div>
		);
	}

	if (decided === 'rejected') {
		return (
			<div className={cx(styles.card, styles.decided)}>
				<X size={13} className={cx(styles.statusIcon, styles.no)} />
				<span className={styles.statusText}>Rejected.</span>
			</div>
		);
	}

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<Shield size={13} className={styles.shieldIcon} />
				<span className={styles.headerLabel}>Action requires approval</span>
				<span className={styles.resourceBadge}>
					{approval.actionType} · {approval.resourceType}
				</span>
			</div>

			<p className={styles.summary}>{approval.summary}</p>

			{approval.diff && (
				<div className={styles.diffSection}>
					<div className={styles.diffHeader}>
						<span className={styles.diffHeaderLabel}>Diff</span>
						<Button
							variant="link"
							size="sm"
							color="secondary"
							onClick={(): void => setDiffExpanded(true)}
							title="Expand diff"
							aria-label="Expand diff"
						>
							<Maximize2 size={12} />
						</Button>
					</div>
					<DiffView diff={approval.diff} />
				</div>
			)}

			<Dialog open={diffExpanded} onOpenChange={setDiffExpanded}>
				<DialogContent
					className={styles.diffDialog}
					style={{ width: '80vw', maxWidth: '80vw', height: '70vh' }}
				>
					<DialogHeader>
						<DialogTitle>Approval diff</DialogTitle>
						<DialogSubtitle>
							{approval.actionType} · {approval.resourceType}
						</DialogSubtitle>
					</DialogHeader>
					<div className={styles.diffModalBody}>
						<p className={styles.diffModalSummary}>{approval.summary}</p>
						<div className={styles.diffToolbarRow}>
							<ToggleGroup
								type="single"
								size="sm"
								value={viewMode}
								onChange={(next): void => {
									// Radix `single` group can emit '' when the active item
									// is clicked again — preserve the current mode.
									if (next === 'split' || next === 'unified') {
										setViewMode(next);
									}
								}}
							>
								<ToggleGroupItem value="split" aria-label="Split view">
									<Columns2 size={12} />
								</ToggleGroupItem>
								<ToggleGroupItem value="unified" aria-label="Unified view">
									<List size={12} />
								</ToggleGroupItem>
							</ToggleGroup>
							<ToggleGroup
								type="multiple"
								size="sm"
								value={wrapText ? ['wrap'] : []}
								onChange={(next): void => setWrapText(next.includes('wrap'))}
							>
								<ToggleGroupItem
									value="wrap"
									aria-label={wrapText ? 'Disable text wrap' : 'Wrap long lines'}
								>
									<WrapText size={12} />
								</ToggleGroupItem>
							</ToggleGroup>
						</div>
						{approval.diff && (
							<DiffView
								diff={approval.diff}
								expanded
								wrapText={wrapText}
								viewMode={viewMode}
							/>
						)}
					</div>
					<DialogCloseButton onClick={(): void => setDiffExpanded(false)} />
				</DialogContent>
			</Dialog>

			<div className={styles.actions}>
				<Button
					variant="solid"
					size="sm"
					onClick={handleApprove}
					disabled={isStreaming}
					prefix={<Check />}
				>
					Approve
				</Button>
				<Button
					variant="outlined"
					size="sm"
					color="secondary"
					onClick={handleReject}
					disabled={isStreaming}
					prefix={<X />}
				>
					Reject
				</Button>
			</div>
		</div>
	);
}

type DiffViewMode = 'split' | 'unified';

interface DiffViewProps {
	diff: ApprovalEventDTODiff;
	expanded?: boolean;
	/** When true, long lines wrap instead of horizontally scrolling. */
	wrapText?: boolean;
	/** Side-by-side ('split') vs single-column ('unified'). Only honored when expanded. */
	viewMode?: DiffViewMode;
}

function DiffView({
	diff,
	expanded = false,
	wrapText = false,
	viewMode = 'split',
}: DiffViewProps): JSX.Element {
	const beforeText =
		diff.before !== undefined ? JSON.stringify(diff.before, null, 2) : '';
	const afterText =
		diff.after !== undefined ? JSON.stringify(diff.after, null, 2) : '';

	// In the inline (collapsed) preview keep the original two-pane layout
	// without diff highlighting — diffing is opt-in via the expanded modal.
	if (!expanded) {
		const jsonClass = cx(styles.diffJson, { [styles.wrapped]: wrapText });
		return (
			<div className={styles.diff}>
				{diff.before !== undefined && (
					<div className={cx(styles.diffBlock, styles.before)}>
						<div className={styles.diffBlockHeader}>
							<span className={styles.diffLabel}>Before</span>
						</div>
						<pre className={jsonClass}>{beforeText}</pre>
					</div>
				)}
				{diff.after !== undefined && (
					<div className={cx(styles.diffBlock, styles.after)}>
						<div className={styles.diffBlockHeader}>
							<span className={styles.diffLabel}>After</span>
						</div>
						<pre className={jsonClass}>{afterText}</pre>
					</div>
				)}
			</div>
		);
	}

	const lines = computeLineDiff(beforeText, afterText);

	if (viewMode === 'unified') {
		// Build the same +/-/space-prefixed text that's on screen so Copy
		// gives the user exactly what they see.
		const unifiedText = lines
			.map((line) => `${prefixFor(line.op)} ${line.text}`)
			.join('\n');
		return (
			<div className={cx(styles.diff, styles.expanded, styles.unified)}>
				<div className={styles.diffBlockHeader}>
					<span className={styles.diffLabel}>Diff</span>
					<div className={styles.diffHeaderActions}>
						<CopyButton text={unifiedText} label="diff" />
					</div>
				</div>
				<div className={cx(styles.diffPane, { [styles.wrapped]: wrapText })}>
					{lines.map((line, idx) => (
						<DiffLine
							// stable enough — input strings are immutable for the view's lifetime
							// eslint-disable-next-line react/no-array-index-key
							key={idx}
							op={line.op}
							text={line.text}
							prefix={prefixFor(line.op)}
						/>
					))}
				</div>
			</div>
		);
	}

	// Split view: align side-by-side using the LCS result. `equal` lines
	// appear on both sides; `remove` only on the left, `add` only on the
	// right (with an empty placeholder on the missing side so rows stay
	// aligned vertically).
	return (
		<div className={cx(styles.diff, styles.expanded)}>
			<div className={cx(styles.diffBlock, styles.before)}>
				<div className={styles.diffBlockHeader}>
					<span className={styles.diffLabel}>Before</span>
					<CopyButton text={beforeText} label="before" />
				</div>
				<div className={cx(styles.diffPane, { [styles.wrapped]: wrapText })}>
					{lines.map((line, idx) => {
						const op = line.op === 'add' ? 'placeholder' : line.op;
						const text = line.op === 'add' ? '' : line.text;
						// eslint-disable-next-line react/no-array-index-key
						return <DiffLine key={idx} op={op} text={text} />;
					})}
				</div>
			</div>
			<div className={cx(styles.diffBlock, styles.after)}>
				<div className={styles.diffBlockHeader}>
					<span className={styles.diffLabel}>After</span>
					<CopyButton text={afterText} label="after" />
				</div>
				<div className={cx(styles.diffPane, { [styles.wrapped]: wrapText })}>
					{lines.map((line, idx) => {
						const op = line.op === 'remove' ? 'placeholder' : line.op;
						const text = line.op === 'remove' ? '' : line.text;
						// eslint-disable-next-line react/no-array-index-key
						return <DiffLine key={idx} op={op} text={text} />;
					})}
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Line diff — small LCS-based implementation. Avoids pulling in `diff`
// since the inputs are JSON.stringify output (line-oriented, typically
// well under a few hundred lines for resource diffs).
// ---------------------------------------------------------------------------

type LineOp = 'equal' | 'add' | 'remove';
type RenderOp = LineOp | 'placeholder';
interface DiffLineEntry {
	op: LineOp;
	text: string;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function computeLineDiff(before: string, after: string): DiffLineEntry[] {
	if (before === after) {
		return splitLines(before).map((text) => ({ op: 'equal', text }));
	}
	const a = splitLines(before);
	const b = splitLines(after);
	const m = a.length;
	const n = b.length;

	// dp[i][j] = length of LCS between a[0..i] and b[0..j]
	const dp: number[][] = Array.from({ length: m + 1 }, () =>
		new Array<number>(n + 1).fill(0),
	);
	for (let i = 1; i <= m; i += 1) {
		for (let j = 1; j <= n; j += 1) {
			if (a[i - 1] === b[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}

	// Backtrack to produce the diff
	const result: DiffLineEntry[] = [];
	let i = m;
	let j = n;
	while (i > 0 && j > 0) {
		if (a[i - 1] === b[j - 1]) {
			result.push({ op: 'equal', text: a[i - 1] });
			i -= 1;
			j -= 1;
		} else if (dp[i - 1][j] >= dp[i][j - 1]) {
			result.push({ op: 'remove', text: a[i - 1] });
			i -= 1;
		} else {
			result.push({ op: 'add', text: b[j - 1] });
			j -= 1;
		}
	}
	while (i > 0) {
		result.push({ op: 'remove', text: a[i - 1] });
		i -= 1;
	}
	while (j > 0) {
		result.push({ op: 'add', text: b[j - 1] });
		j -= 1;
	}
	result.reverse();
	return result;
}

function splitLines(text: string): string[] {
	if (text === '') {
		return [];
	}
	return text.split('\n');
}

function prefixFor(op: LineOp): string {
	if (op === 'add') {
		return '+';
	}
	if (op === 'remove') {
		return '-';
	}
	return ' ';
}

interface DiffLineProps {
	op: RenderOp;
	text: string;
	/** Optional gutter prefix used in unified view (`+` / `-` / ` `). */
	prefix?: string;
}

function DiffLine({ op, text, prefix }: DiffLineProps): JSX.Element {
	const cls = cx(styles.diffLine, {
		[styles.diffLineAdd]: op === 'add',
		[styles.diffLineRemove]: op === 'remove',
		[styles.diffLinePlaceholder]: op === 'placeholder',
	});
	return (
		<div className={cls}>
			{prefix !== undefined && (
				<span className={styles.diffGutter} aria-hidden="true">
					{prefix}
				</span>
			)}
			<span className={styles.diffLineText}>{text || ' '}</span>
		</div>
	);
}

interface CopyButtonProps {
	text: string;
	label: string;
}

function CopyButton({ text, label }: CopyButtonProps): JSX.Element {
	const [copied, setCopied] = useState(false);
	const [, copyToClipboard] = useCopyToClipboard();
	// Track the timeout so an unmount mid-flight doesn't try to setState on
	// a dead component (and so a rapid re-click resets the 1.5s window).
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => (): void => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		},
		[],
	);

	const handleCopy = (): void => {
		copyToClipboard(text);
		setCopied(true);
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = setTimeout(() => setCopied(false), 1500);
	};

	return (
		<Button
			variant="ghost"
			size="sm"
			color="secondary"
			onClick={handleCopy}
			title={copied ? `Copied ${label}` : `Copy ${label}`}
			aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
		>
			{copied ? <Check size={12} /> : <Copy size={12} />}
		</Button>
	);
}
