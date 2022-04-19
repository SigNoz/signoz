import { Button } from 'antd';
import { NotificationInstance } from 'antd/lib/notification';
import deleteAlert from 'api/channels/delete';
import React, { useState } from 'react';
import { Channels } from 'types/api/channels/getAll';

function Delete({ notifications, setChannels, id }: DeleteProps): JSX.Element {
	const [loading, setLoading] = useState(false);

	const onClickHandler = async (): Promise<void> => {
		try {
			setLoading(true);
			const response = await deleteAlert({
				id,
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Success',
					description: 'Channel Deleted Successfully',
				});
				setChannels((preChannels) => preChannels.filter((e) => e.id !== id));
			} else {
				notifications.error({
					message: 'Error',
					description: response.error || 'Something went wrong',
				});
			}
			setLoading(false);
		} catch (error) {
			notifications.error({
				message: 'Error',
				description:
					error instanceof Error ? error.toString() : 'Something went wrong',
			});
			setLoading(false);
		}
	};

	return (
		<Button
			loading={loading}
			disabled={loading}
			type="link"
			onClick={onClickHandler}
		>
			Delete
		</Button>
	);
}

interface DeleteProps {
	notifications: NotificationInstance;
	setChannels: React.Dispatch<React.SetStateAction<Channels[]>>;
	id: string;
}

export default Delete;
