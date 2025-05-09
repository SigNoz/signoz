import { Button } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import deleteChannel from 'api/channels/delete';
import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Channels } from 'types/api/channels/getAll';
import APIError from 'types/api/error';

function Delete({ notifications, setChannels, id }: DeleteProps): JSX.Element {
	const { t } = useTranslation(['channels']);
	const [loading, setLoading] = useState(false);

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
			setChannels((preChannels) => preChannels.filter((e) => e.id !== id));
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
	setChannels: Dispatch<SetStateAction<Channels[]>>;
	id: string;
}

export default Delete;
