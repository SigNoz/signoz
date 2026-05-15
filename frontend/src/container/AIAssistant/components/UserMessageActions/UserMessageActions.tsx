import { useCallback, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Check, Copy } from '@signozhq/icons';

import { Message } from '../../types';

import styles from './UserMessageActions.module.scss';

interface UserMessageActionsProps {
	message: Message;
}

/**
 * Action row rendered under user message bubbles. Mirrors the assistant
 * feedback strip's hover-reveal treatment via the bubble's
 * `--feedback-opacity` CSS variable; intentionally minimal for now —
 * additional actions (edit, share, …) can slot in alongside the copy chip.
 */
export default function UserMessageActions({
	message,
}: UserMessageActionsProps): JSX.Element {
	const [copied, setCopied] = useState(false);
	const [, copyToClipboard] = useCopyToClipboard();

	const handleCopy = useCallback((): void => {
		copyToClipboard(message.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}, [copyToClipboard, message.content]);

	return (
		<div className={styles.actions}>
			<TooltipSimple title={copied ? 'Copied!' : 'Copy'}>
				<Button
					className={styles.btn}
					size="icon"
					variant="ghost"
					color="secondary"
					onClick={handleCopy}
				>
					{copied ? <Check size={12} /> : <Copy size={12} />}
				</Button>
			</TooltipSimple>
		</div>
	);
}
