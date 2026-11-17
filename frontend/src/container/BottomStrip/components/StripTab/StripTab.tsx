import type { ReactElement } from 'react';
import { X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import cx from 'classnames';

import styles from './StripTab.module.scss';

interface StripTabProps {
	label: string;
	onClick: () => void;
	onClose: () => void;
	prefix?: ReactElement;
	isActive?: boolean;
	ariaLabel?: string;
	testId?: string;
}

/** A closable tab: the label opens it, the × beside it closes it. */
function StripTab({
	label,
	onClick,
	onClose,
	prefix,
	isActive,
	ariaLabel,
	testId,
}: StripTabProps): JSX.Element {
	return (
		<div
			className={cx(styles.stripTab, isActive && styles.isActive)}
			data-active={isActive || undefined}
			data-testid={testId}
		>
			<span className={styles.open}>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					prefix={prefix}
					onClick={onClick}
					aria-label={ariaLabel}
					aria-current={isActive || undefined}
					testId={testId ? `${testId}-open` : undefined}
				>
					{label}
				</Button>
			</span>
			<span className={styles.close}>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					onClick={onClose}
					aria-label={`Close ${label}`}
					testId={testId ? `${testId}-close` : undefined}
				>
					<X size={12} />
				</Button>
			</span>
		</div>
	);
}

StripTab.defaultProps = {
	prefix: undefined,
	isActive: false,
	ariaLabel: undefined,
	testId: undefined,
};

export default StripTab;
