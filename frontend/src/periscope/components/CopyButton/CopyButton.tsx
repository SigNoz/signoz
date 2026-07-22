import { CSSProperties, useCallback } from 'react';
import { Check, Copy } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import cx from 'classnames';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';

import styles from './CopyButton.module.scss';

export interface CopyButtonProps {
	/** Text written to the clipboard on click. */
	value: string;
	/** Icon size in px. Default 14. */
	size?: number;
	/** Accessible label for the idle (not-yet-copied) state. Default "Copy". */
	ariaLabel?: string;
	/** Extra class merged onto the button. */
	className?: string;
	testId?: string;
}

/**
 * Square, icon-only copy button. Shows a copy icon that cross-fades to a
 * checkmark (blur + rotate + fade) on copy, reverting after 2s. The checkmark
 * uses the hover-state icon colour.
 */
function CopyButton({
	value,
	size = 14,
	ariaLabel = 'Copy',
	className,
	testId,
}: CopyButtonProps): JSX.Element {
	const { copyToClipboard, isCopied } = useCopyToClipboard();

	const handleClick = useCallback((): void => {
		copyToClipboard(value);
	}, [copyToClipboard, value]);

	const stackStyle: CSSProperties = { width: size, height: size };

	return (
		<Button
			variant="ghost"
			color="secondary"
			size="icon"
			className={cx(styles.copyButton, className)}
			onClick={handleClick}
			aria-label={isCopied ? 'Copied' : ariaLabel}
			testId={testId}
		>
			<span className={styles.iconStack} style={stackStyle} data-copied={isCopied}>
				<Copy size={size} className={cx(styles.icon, styles.copyIcon)} />
				<Check size={size} className={cx(styles.icon, styles.checkIcon)} />
			</span>
		</Button>
	);
}

CopyButton.defaultProps = {
	size: 14,
	ariaLabel: 'Copy',
	className: undefined,
	testId: undefined,
};

export default CopyButton;
