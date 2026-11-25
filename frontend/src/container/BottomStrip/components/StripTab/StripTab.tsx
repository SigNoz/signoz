import type { ReactElement } from 'react';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { X } from '@signozhq/icons';

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

/** A closable tab: the label opens it, the × over its end closes it. */
function StripTab({
	label,
	onClick,
	onClose,
	prefix,
	isActive = false,
	ariaLabel,
	testId,
}: StripTabProps): JSX.Element {
	return (
		<div
			className={cx(styles.stripTab, { [styles.active]: isActive })}
			data-testid={testId}
		>
			<span className={styles.open}>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					width="100%"
					maxWidth={150.5}
					prefix={prefix}
					onClick={onClick}
					aria-label={ariaLabel}
					aria-current={isActive || undefined}
					testId={testId && `${testId}-open`}
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
					testId={testId && `${testId}-close`}
				>
					<X size={14} strokeWidth={1.5} />
				</Button>
			</span>
		</div>
	);
}

export default StripTab;
