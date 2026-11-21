import cx from 'classnames';
import { Package } from '@signozhq/icons';

import type { MessageContext } from 'api/ai-assistant/chat';

import { useVariant } from '../../VariantContext';
import {
	AUTO_CONTEXT_ICONS,
	CONTEXT_TYPE_LABELS,
} from '../ChatInput/contextPicker';
import ContextPill from '../ChatInput/ContextPill/ContextPill';

import styles from './AddedContexts.module.scss';

interface AddedContextsProps {
	contexts: MessageContext[];
}

/** The resources a message was sent with, by @-pick; the page it came from is left out. */
export default function AddedContexts({
	contexts,
}: AddedContextsProps): JSX.Element | null {
	const variant = useVariant();
	const picked = contexts.filter((ctx) => ctx.source === 'mention');
	if (picked.length === 0) {
		return null;
	}

	return (
		<div
			className={cx(styles.addedContexts, {
				[styles.compact]: variant === 'panel',
			})}
			data-testid="ai-added-contexts"
		>
			{picked.map((ctx) => (
				<ContextPill
					key={`${ctx.type}:${ctx.resourceId ?? ctx.resourceName}`}
					// The server may name a type this client predates.
					icon={AUTO_CONTEXT_ICONS[ctx.type] ?? Package}
					category={CONTEXT_TYPE_LABELS[ctx.type] ?? ctx.type}
					label={ctx.resourceName ?? ctx.resourceId ?? ''}
				/>
			))}
			<span className={styles.note}>added to context</span>
		</div>
	);
}
