import './PlannedDowntime.styles.scss';

import { Button, Modal, Typography } from 'antd';
import { Trash2, X } from 'lucide-react';
import { SetStateAction } from 'react';

interface PlannedDowntimeDeleteModalProps {
	isDeleteModalOpen: boolean;
	setIsDeleteModalOpen: (value: SetStateAction<boolean>) => void;
	onDeleteHandler: () => void;
	isDeleteLoading: boolean;
	downtimeSchedule: string;
}

export function PlannedDowntimeDeleteModal(
	props: PlannedDowntimeDeleteModalProps,
): JSX.Element {
	const {
		isDeleteModalOpen,
		setIsDeleteModalOpen,
		isDeleteLoading,
		onDeleteHandler,
		downtimeSchedule,
	} = props;
	const hideDeleteViewModal = (): void => {
		setIsDeleteModalOpen(false);
	};
	return (
		<Modal
			className="delete-view-modal"
			title={<span className="title">Delete view</span>}
			open={isDeleteModalOpen}
			closable={false}
			onCancel={hideDeleteViewModal}
			footer={[
				<Button
					key="cancel"
					onClick={hideDeleteViewModal}
					className="cancel-btn"
					icon={<X size={16} />}
				>
					Cancel
				</Button>,
				<Button
					key="submit"
					icon={<Trash2 size={16} />}
					onClick={onDeleteHandler}
					className="delete-btn"
					disabled={isDeleteLoading}
				>
					Delete view
				</Button>,
			]}
		>
			<Typography.Text className="delete-text">
				{`Are you sure you want to delete - ${downtimeSchedule} view? Deleting a view is irreversible and cannot be undone.`}
			</Typography.Text>
		</Modal>
	);
}
