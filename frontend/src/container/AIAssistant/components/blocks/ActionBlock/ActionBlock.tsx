import { useEffect, useRef, useState } from 'react';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { Check, LoaderCircle, TriangleAlert, X, Zap } from '@signozhq/icons';

import { PageActionRegistry } from '../../../pageActions/PageActionRegistry';
import { AIActionBlock } from '../../../pageActions/types';
import { useAIAssistantStore } from '../../../store/useAIAssistantStore';
import { useMessageContext } from '../../MessageContext';

import blockStyles from '../Block.module.scss';
import styles from './ActionBlock.module.scss';

type BlockState = 'pending' | 'loading' | 'applied' | 'dismissed' | 'error';

/**
 * Renders an AI-suggested page action.
 *
 * Two modes based on the registered PageAction.autoApply flag:
 *
 *   autoApply = false (default)
 *     Shows a confirmation card with Accept / Dismiss. The user must
 *     explicitly approve before execute() is called. Use for destructive or
 *     hard-to-reverse actions (create dashboard, delete alert, etc.).
 *
 *   autoApply = true
 *     Executes immediately on mount — no card shown, just the result summary.
 *     Use for low-risk, reversible actions where the user explicitly asked for
 *     the change (e.g. "filter logs for errors"). Avoids unnecessary friction.
 *
 * Persists answered state via answeredBlocks so re-mounts don't reset UI.
 */
export default function ActionBlock({
	data,
}: {
	data: AIActionBlock;
}): JSX.Element {
	const { messageId } = useMessageContext();
	const answeredBlocks = useAIAssistantStore((s) => s.answeredBlocks);
	const markBlockAnswered = useAIAssistantStore((s) => s.markBlockAnswered);

	const [localState, setLocalState] = useState<BlockState>(() => {
		if (!messageId) {
			return 'pending';
		}
		const saved = answeredBlocks[messageId];
		if (!saved) {
			return 'pending';
		}
		if (saved === 'dismissed') {
			return 'dismissed';
		}
		if (saved.startsWith('error:')) {
			return 'error';
		}
		return 'applied';
	});
	const [resultSummary, setResultSummary] = useState<string>('');
	const [errorMessage, setErrorMessage] = useState<string>('');

	const { actionId, description, parameters } = data;

	// ── Shared execute logic ─────────────────────────────────────────────────────

	const execute = async (): Promise<void> => {
		const action = PageActionRegistry.get(actionId);

		if (!action) {
			const msg = `Action "${actionId}" is not available on the current page.`;
			setErrorMessage(msg);
			setLocalState('error');
			if (messageId) {
				markBlockAnswered(messageId, `error:${msg}`);
			}
			return;
		}

		setLocalState('loading');

		try {
			const result = await action.execute(parameters as never);
			setResultSummary(result.summary);
			setLocalState('applied');
			if (messageId) {
				markBlockAnswered(messageId, `applied:${result.summary}`);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Unknown error';
			setErrorMessage(msg);
			setLocalState('error');
			if (messageId) {
				markBlockAnswered(messageId, `error:${msg}`);
			}
		}
	};

	// ── Auto-apply: fire immediately on mount if the action opts in ──────────────

	const autoApplyFired = useRef(false);

	useEffect(() => {
		// Only auto-apply once, and only when the block hasn't been answered yet
		// (i.e. this is a fresh render, not a remount of an already-answered block).
		if (autoApplyFired.current || localState !== 'pending') {
			return;
		}

		const action = PageActionRegistry.get(actionId);
		if (!action?.autoApply) {
			return;
		}

		autoApplyFired.current = true;
		execute();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleDismiss = (): void => {
		setLocalState('dismissed');
		if (messageId) {
			markBlockAnswered(messageId, 'dismissed');
		}
	};

	// ── Terminal states ──────────────────────────────────────────────────────────

	if (localState === 'applied') {
		return (
			<div className={cx(blockStyles.block, styles.applied)}>
				<Check size={13} className={cx(styles.statusIcon, styles.ok)} />
				<span className={styles.statusText}>{resultSummary || 'Applied.'}</span>
			</div>
		);
	}

	if (localState === 'dismissed') {
		return (
			<div className={cx(blockStyles.block, styles.dismissed)}>
				<X size={13} className={cx(styles.statusIcon, styles.no)} />
				<span className={styles.statusText}>Dismissed.</span>
			</div>
		);
	}

	if (localState === 'error') {
		return (
			<div className={cx(blockStyles.block, styles.error)}>
				<TriangleAlert size={13} className={cx(styles.statusIcon, styles.err)} />
				<span className={styles.statusText}>{errorMessage}</span>
			</div>
		);
	}

	// ── Loading (autoApply in progress) ─────────────────────────────────────────

	if (localState === 'loading') {
		return (
			<div className={cx(blockStyles.block, styles.loading)}>
				<LoaderCircle size={13} className={cx(styles.spinner, styles.statusIcon)} />
				<span className={styles.statusText}>{description}</span>
			</div>
		);
	}

	// ── Pending: manual confirmation card ────────────────────────────────────────

	const paramEntries = Object.entries(parameters ?? {});

	return (
		<div className={blockStyles.block}>
			<div className={styles.header}>
				<Zap size={13} className={styles.zapIcon} />
				<span className={styles.headerLabel}>Suggested Action</span>
			</div>

			<p className={styles.description}>{description}</p>

			{paramEntries.length > 0 && (
				<ul className={styles.params}>
					{paramEntries.map(([key, val]) => (
						<li key={key} className={styles.param}>
							<span className={styles.paramKey}>{key}</span>
							<span className={styles.paramVal}>
								{typeof val === 'object' ? JSON.stringify(val) : String(val)}
							</span>
						</li>
					))}
				</ul>
			)}

			<div className={styles.actions}>
				<Button variant="solid" size="sm" onClick={execute}>
					<Check size={12} />
					Apply
				</Button>
				<Button variant="outlined" size="sm" onClick={handleDismiss}>
					<X size={12} />
					Dismiss
				</Button>
			</div>
		</div>
	);
}
