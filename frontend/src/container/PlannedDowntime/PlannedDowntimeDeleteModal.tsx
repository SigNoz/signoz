import { SetStateAction } from 'react';
import { Button, Modal } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Trash2, X } from '@signozhq/icons';

import './PlannedDowntime.styles.scss';

interface PlannedDowntimeDeleteModalProps {
	isDeleteModalOpen: boolean;
	setIsDeleteModalOpen: (value: SetStateAction<boolean>) => void;
	onDeleteHandler: () => void;
	isDeleteLoading: boolean;
	downtimeSchedule: string;
	hasAssociatedRules: boolean;
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
		hasAssociatedRules,
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
					Delete Schedule
				</Button>,
			]}
		>
			<Typography.Text className="delete-text">
				{hasAssociatedRules
					? `Are you sure you want to delete - ${downtimeSchedule} schedule? The rule associations will be removed, and any rule that belongs only to this schedule will no longer be suppressed. Deleting is irreversible and cannot be undone.`
					: `Are you sure you want to delete - ${downtimeSchedule} schedule? Deleting a schedule is irreversible and cannot be undone.`}
			</Typography.Text>
		</Modal>
	);
}
