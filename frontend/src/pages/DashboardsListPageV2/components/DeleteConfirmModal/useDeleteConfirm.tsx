import { type ReactNode } from 'react';
import { Modal } from 'antd';
import { CircleAlert } from '@signozhq/icons';

import styles from './DeleteConfirmModal.module.scss';

interface ConfirmDeleteOptions {
	title: ReactNode;
	content?: ReactNode;
	confirmText?: string;
	onConfirm: () => void | Promise<void>;
}

interface UseDeleteConfirm {
	/** Must be rendered in the calling component for the modal to appear. */
	contextHolder: ReactNode;
	confirmDelete: (options: ConfirmDeleteOptions) => void;
}

/**
 * Shared destructive confirmation for deleting dashboards and saved views, so
 * both get the same alert icon, aligned title, danger button, and a working
 * Cancel (antd closes on Cancel as long as we don't override its `onClick`).
 */
export function useDeleteConfirm(): UseDeleteConfirm {
	const [modal, contextHolder] = Modal.useModal();

	const confirmDelete = ({
		title,
		content,
		confirmText = 'Delete',
		onConfirm,
	}: ConfirmDeleteOptions): void => {
		modal.confirm({
			className: styles.deleteModal,
			title,
			content,
			icon: <CircleAlert className={styles.icon} size={20} />,
			okText: confirmText,
			okButtonProps: { danger: true },
			// Returning a promise keeps Delete in a loading state until the action
			// settles, then antd closes the modal.
			onOk: () => Promise.resolve(onConfirm()),
			centered: true,
		});
	};

	return { contextHolder, confirmDelete };
}
