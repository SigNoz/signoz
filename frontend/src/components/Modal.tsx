import { Modal, ModalProps as Props } from 'antd';
import React, { ReactElement } from 'react';

const CustomModal = ({
	title,
	children,
	isModalVisible,
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
	footer?: Props['footer'];
	title: string;
	children: ReactElement;
}

export default CustomModal;
