import './RenameModal.styles.scss';

import { Button, Input, InputRef, Modal, Typography } from 'antd';
import { Check, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

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

	const buttonProps = {
		size: 14,
		onClick: (action: 'rename' | 'cancel') => (): void => {
			if (action === 'rename') {
				onNameChangeHandler();
			} else {
				setIsOpen(false);
			}
		},
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent): void => {
			if (isOpen) {
				if (e.key === 'Enter') {
					onNameChangeHandler();
				} else if (e.key === 'Escape') {
					setIsOpen(false);
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return (): void => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen, onNameChangeHandler, setIsOpen]);
	return (
		<Modal
			open={isOpen}
			title="Rename Alert"
			onOk={onNameChangeHandler}
			onCancel={buttonProps.onClick('cancel')}
			rootClassName="rename-alert"
			footer={
				<div className="alert-rename">
					<Button
						type="primary"
						icon={<Check size={buttonProps.size} />}
						className="rename-btn"
						onClick={buttonProps.onClick('rename')}
						disabled={isLoading}
					>
						Rename Alert
					</Button>
					<Button
						type="text"
						icon={<X size={buttonProps.size} />}
						className="cancel-btn"
						onClick={buttonProps.onClick('cancel')}
					>
						Cancel
					</Button>
				</div>
			}
		>
			<div className="alert-content">
				<Typography.Text className="name-text">Enter a new name</Typography.Text>
				<Input
					ref={inputRef}
					data-testid="alert-name"
					className="alert-name-input"
					value={intermediateName}
					onChange={(e): void => setIntermediateName(e.target.value)}
				/>
			</div>
		</Modal>
	);
}

export default RenameModal;
