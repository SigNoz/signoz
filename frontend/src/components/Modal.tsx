import { Modal } from 'antd';
import React, { ReactElement } from 'react';

const CustomModal = ({
	title,
	children,
	isModalVisible,
	setIsModalVisible,
	footer,
	closable = true,
}: ModalProps): JSX.Element => {
	return (
		<>
			<Modal
				title={title}
				visible={isModalVisible}
				footer={footer}
				closable={closable}
			>
				{children}
			</Modal>
		</>
	);
};

interface ModalProps {
	isModalVisible: boolean;
	closable?: boolean;
	setIsModalVisible: () => void;
	footer?: any;
	title: string;
	children: ReactElement;
}

export default CustomModal;
