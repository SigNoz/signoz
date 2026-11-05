import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SolidAlertCircle } from '@signozhq/icons';
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
				<Callout.Closeable
					color="danger"
					size="sm"
					icon={<SolidAlertCircle />}
					closed={false}
					onClose={onDismissError}
					testId="gcp-connect-error"
				>
					{errorTitle}. {error}
				</Callout.Closeable>
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
