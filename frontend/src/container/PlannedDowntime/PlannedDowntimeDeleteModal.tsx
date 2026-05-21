import { SetStateAction } from 'react';
import { Trash2, X } from '@signozhq/icons';
import { Modal } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import './PlannedDowntime.styles.scss';

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
	const hideDeleteScheduleModal = (): void => {
		setIsDeleteModalOpen(false);
	};
	return (
		<Modal
			className="delete-schedule-modal"
			title={<span className="title">Delete Schedule</span>}
			open={isDeleteModalOpen}
			closable={false}
			onCancel={hideDeleteScheduleModal}
			footer={[
				<Button
					key="cancel"
					onClick={hideDeleteScheduleModal}
					className="cancel-btn"
					variant="outlined"
					color="secondary"
					prefix={<X size={16} />}
				>
					Cancel
				</Button>,
				<Button
					key="submit"
					onClick={onDeleteHandler}
					className="delete-btn"
					disabled={isDeleteLoading}
					variant="outlined"
					color="secondary"
					prefix={<Trash2 size={16} />}
				>
					Delete Schedule
				</Button>,
			]}
		>
			<Typography.Text className="delete-text">
				{`Are you sure you want to delete - ${downtimeSchedule} schedule? Deleting a schedule is irreversible and cannot be undone.`}
			</Typography.Text>
		</Modal>
	);
}
