import { Button } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import deleteChannel from 'api/channels/delete';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import APIError from 'types/api/error';

function Delete({ notifications, id }: DeleteProps): JSX.Element {
	const { t } = useTranslation(['channels']);
	const [loading, setLoading] = useState(false);
	const queryClient = useQueryClient();

	const onClickHandler = async (): Promise<void> => {
		try {
			setLoading(true);
			await deleteChannel({
				id,
			});

			notifications.success({
				message: 'Success',
				description: t('channel_delete_success'),
			});
			// Invalidate and refetch
			queryClient.invalidateQueries(['getChannels']);
			setLoading(false);
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
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
	id: string;
}

export default Delete;
