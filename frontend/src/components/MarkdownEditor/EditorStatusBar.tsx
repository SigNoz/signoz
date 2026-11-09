import type { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import type { CursorPosition } from './types';

import styles from './MarkdownEditor.module.scss';

interface EditorStatusBarProps {
	cursor: CursorPosition;
	length: number;
	maxLength: number;
	hint?: ReactNode;
}

function EditorStatusBar({
	cursor,
	length,
	maxLength,
	hint,
}: EditorStatusBarProps): JSX.Element {
	const isOverLimit = length > maxLength;

	return (
		<div className={styles.statusBar} data-testid="markdown-editor-status">
			<Typography
				variant="code"
				size="small"
				weight="regular"
				color="tertiary"
				as="span"
				display="inline-flex"
				gap={3}
				textOverflow="wrap"
			>
				{`Ln ${cursor.line}, Col ${cursor.column}`}
				<span className={styles.statusSeparator}>·</span>
				<span
					className={cx(styles.statusCount, {
						[styles.statusCountOverLimit]: isOverLimit,
					})}
					data-testid="markdown-editor-char-count"
				>
					{isOverLimit ? `${length} / ${maxLength} chars` : `${length} chars`}
				</span>
			</Typography>
			{hint && (
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="tertiary"
					as="span"
					textOverflow="wrap"
				>
					{hint}
				</Typography>
			)}
		</div>
	);
}

export default EditorStatusBar;
