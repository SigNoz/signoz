import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';

import styles from './SetupDrawerFooter.module.scss';

interface SetupDrawerFooterProps {
	slot: HTMLDivElement | null;
	errorTitle: string;
	error: string | null;
	onDismissError: () => void;
	onCancel: () => void;
	children?: ReactNode;
}

function SetupDrawerFooter({
	slot,
	errorTitle,
	error,
	onDismissError,
	onCancel,
	children,
}: SetupDrawerFooterProps): JSX.Element | null {
	if (!slot) {
		return null;
	}

	return createPortal(
		<div className={styles.footerContainer}>
			{error && (
				<Callout
					type="error"
					size="small"
					showIcon
					action="dismissible"
					onClick={onDismissError}
					title={errorTitle}
					testId="gcp-connect-error"
				>
					{error}
				</Callout>
			)}
			<div className={styles.footer}>
				<Button
					size="md"
					variant="outlined"
					color="secondary"
					onClick={onCancel}
					testId="gcp-cancel-btn"
				>
					Cancel
				</Button>
				{children}
			</div>
		</div>,
		slot,
	);
}

SetupDrawerFooter.defaultProps = {
	children: undefined,
};

export default SetupDrawerFooter;
