import { Modal, ModalProps as Props } from 'antd';
import { ReactElement } from 'react';

function CustomModal({
	title,
	children,
	isModalVisible,
	footer,
	closable = true,
}: ModalProps): JSX.Element {
	return (
		<Modal
			title={title}
			open={isModalVisible}
			footer={footer}
			closable={closable}
		>
			{children}
		</Modal>
	);
}

interface ModalProps {
	isModalVisible: boolean;
	closable?: boolean;
	footer?: Props['footer'];
	title: string;
	children: ReactElement;
}

CustomModal.defaultProps = {
	closable: undefined,
	footer: undefined,
};

export default CustomModal;
