import { X } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuthZDevStore } from '../useAuthZDevStore';

import styles from './AuthZDevFloatingIndicator.module.css';

export function AuthZDevFloatingIndicator(): JSX.Element | null {
	const overrides = useAuthZDevStore((s) => s.overrides);
	const isModalOpen = useAuthZDevStore((s) => s.isModalOpen);
	const openModal = useAuthZDevStore((s) => s.openModal);
	const [isDismissed, setIsDismissed] = useState(false);

	const overrideCount = Object.keys(overrides).length;

	if (overrideCount === 0 || isModalOpen || isDismissed) {
		return null;
	}

	const handleOpen = (): void => {
		setIsDismissed(false);
		openModal();
	};

	const handleDismiss = (e: React.MouseEvent): void => {
		e.stopPropagation();
		setIsDismissed(true);
	};

	return createPortal(
		<div className={styles.container}>
			<Button
				variant="solid"
				color="warning"
				size="sm"
				onClick={handleOpen}
				className={styles.button}
				data-testid="authz-dev-floating-indicator"
			>
				AuthZ Overrides
				<Badge color="warning" className={styles.badge}>
					{overrideCount}
				</Badge>
			</Button>
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				onClick={handleDismiss}
				className={styles.closeButton}
				aria-label="Dismiss indicator"
				data-testid="authz-dev-floating-dismiss"
				prefix={<X />}
			/>
		</div>,
		document.body,
	);
}
