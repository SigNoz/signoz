import '../MySettings.styles.scss';
import './UserInfo.styles.scss';

import { Button, Card, Flex, Input, Space, Typography } from 'antd';
import editUser from 'api/user/editUser';
import { useNotifications } from 'hooks/useNotifications';
import { PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_USER } from 'types/actions/app';
import AppReducer from 'types/reducer/app';

import { NameInput } from '../styles';

function UserInfo(): JSX.Element {
	const { user, role, org, userFlags } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);
	const { t } = useTranslation();
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const [changedName, setChangedName] = useState<string>(user?.name || '');
	const [loading, setLoading] = useState<boolean>(false);

	const { notifications } = useNotifications();

	if (!user || !org) {
		return <div />;
	}

	const onClickUpdateHandler = async (): Promise<void> => {
		try {
			setLoading(true);
			const { statusCode } = await editUser({
				name: changedName,
				userId: user.userId,
			});

			if (statusCode === 200) {
				notifications.success({
					message: t('success', {
						ns: 'common',
					}),
				});
				dispatch({
					type: UPDATE_USER,
					payload: {
						...user,
						name: changedName,
						ROLE: role || 'ADMIN',
						orgId: org[0].id,
						orgName: org[0].name,
						userFlags: userFlags || {},
					},
				});
			} else {
				notifications.error({
					message: t('something_went_wrong', {
						ns: 'common',
					}),
				});
			}
			setLoading(false);
		} catch (error) {
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
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
						value={role || ''}
						disabled
						data-testid="role-textbox"
					/>
				</Space>
			</Space>
		</Card>
	);
}

export default UserInfo;
