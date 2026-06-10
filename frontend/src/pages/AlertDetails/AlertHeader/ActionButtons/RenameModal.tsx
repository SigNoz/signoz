import { useCallback, useEffect, useRef } from 'react';
import { Button, Input, InputRef, Modal } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Check, X } from '@signozhq/icons';

import styles from './RenameModal.module.scss';

type Props = {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	onNameChangeHandler: () => void;
	isLoading: boolean;
	intermediateName: string;
	setIntermediateName: (name: string) => void;
};

function RenameModal({
	isOpen,
	setIsOpen,
	onNameChangeHandler,
	isLoading,
	intermediateName,
	setIntermediateName,
}: Props): JSX.Element {
	const inputRef = useRef<InputRef>(null);

	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen]);

	const handleClose = useCallback((): void => setIsOpen(false), [setIsOpen]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent): void => {
			if (isOpen) {
				if (e.key === 'Enter') {
					onNameChangeHandler();
				} else if (e.key === 'Escape') {
					handleClose();
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return (): void => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen, onNameChangeHandler, handleClose]);

	return (
		<Modal
			open={isOpen}
			title="Rename Alert"
			onOk={onNameChangeHandler}
			onCancel={handleClose}
			rootClassName={styles.renameAlertContainer}
			footer={
				<div className={styles.alertRename}>
					<Button
						type="primary"
						icon={<Check size={14} />}
						className={styles.renameBtn}
						onClick={onNameChangeHandler}
						disabled={isLoading}
					>
						Rename Alert
					</Button>
					<Button
						type="text"
						icon={<X size={14} />}
						className={styles.cancelBtn}
						onClick={handleClose}
					>
						Cancel
					</Button>
				</div>
			}
		>
			<div className={styles.alertContent}>
				<Typography.Text className={styles.nameText}>
					Enter a new name
				</Typography.Text>
				<Input
					ref={inputRef}
					data-testid="alert-name"
					className={styles.alertNameInput}
					value={intermediateName}
					onChange={(e): void => setIntermediateName(e.target.value)}
				/>
			</div>
		</Modal>
	);
}

export default RenameModal;
