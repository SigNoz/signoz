import '../MySettings.styles.scss';
import './UserInfo.styles.scss';

import { Button, Card, Flex, Input, Space, Typography } from 'antd';
import editUser from 'api/v1/user/id/update';
import { useNotifications } from 'hooks/useNotifications';
import { PencilIcon } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import APIError from 'types/api/error';

import { NameInput } from '../styles';

function UserInfo(): JSX.Element {
	const { user, org, updateUser } = useAppContext();
	const { t } = useTranslation();

	const [changedName, setChangedName] = useState<string>(
		user?.displayName || '',
	);
	const [loading, setLoading] = useState<boolean>(false);

	const { notifications } = useNotifications();

	if (!user || !org) {
		return <div />;
	}

	const onClickUpdateHandler = async (): Promise<void> => {
		try {
			setLoading(true);
			await editUser({
				displayName: changedName,
				userId: user.id,
			});

			notifications.success({
				message: t('success', {
					ns: 'common',
				}),
			});
			updateUser({
				...user,
				displayName: changedName,
			});
			setLoading(false);
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
			});
		}
		setLoading(false);
	};

	return (
		<Card>
			<Space direction="vertical" size="middle">
				<Flex gap={8}>
					<Typography.Title level={4} style={{ marginTop: 0 }}>
						User Details
					</Typography.Title>
				</Flex>

				<Flex gap={16}>
					<Space>
						<Typography className="userInfo-label" data-testid="name-label">
							Name
						</Typography>
						<NameInput
							data-testid="name-textbox"
							placeholder="Your Name"
							onChange={(event): void => {
								setChangedName(event.target.value);
							}}
							value={changedName}
							disabled={loading}
						/>
					</Space>

					<Button
						className="flexBtn"
						loading={loading}
						disabled={loading}
						onClick={onClickUpdateHandler}
						data-testid="update-name-button"
						type="primary"
					>
						<PencilIcon size={12} /> Update
					</Button>
				</Flex>

				<Space>
					<Typography className="userInfo-label" data-testid="email-label">
						{' '}
						Email{' '}
					</Typography>
					<Input
						className="userInfo-value"
						data-testid="email-textbox"
						value={user.email}
						disabled
					/>
				</Space>

				<Space>
					<Typography className="userInfo-label" data-testid="role-label">
						{' '}
						Role{' '}
					</Typography>
					<Input
						className="userInfo-value"
						value={user.role || ''}
						disabled
						data-testid="role-textbox"
					/>
				</Space>
			</Space>
		</Card>
	);
}

export default UserInfo;
