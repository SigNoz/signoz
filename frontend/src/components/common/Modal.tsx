import React, { ReactElement, useState } from "react";
import { Modal, Button } from "antd";

export const CustomModal = ({
	title,
	children,
	isModalVisible,
	setIsModalVisible,
	footer,
	closable = true,
}: {
	isModalVisible: boolean;
	closable?: boolean;
	setIsModalVisible: Function;
	footer?: any;
	title: string;
	children: ReactElement;
}) => {
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
