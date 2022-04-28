import { Button, notification, Space, Typography } from 'antd';
import editUser from 'api/user/editUser';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_USER } from 'types/actions/app';
import AppReducer from 'types/reducer/app';

import { NameInput } from '../styles';

function UpdateName(): JSX.Element {
	const { user, role, org } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);
	const { t } = useTranslation();
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const [changedName, setChangedName] = useState<string>(user?.name || '');
	const [loading, setLoading] = useState<boolean>(false);

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
				notification.success({
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
					},
				});
			} else {
				notification.error({
					message: t('something_went_wrong', {
						ns: 'common',
					}),
				});
			}
			setLoading(false);
		} catch (error) {
			notification.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
		setLoading(false);
	};

	return (
		<div>
			<Space direction="vertical" size="middle">
				<Typography>Name</Typography>
				<NameInput
					placeholder="Mike Tyson"
					onChange={(event): void => {
						setChangedName(event.target.value);
					}}
					value={changedName}
					disabled={loading}
				/>
				<Button
					loading={loading}
					disabled={loading}
					onClick={onClickUpdateHandler}
					type="primary"
				>
					Update Name
				</Button>
			</Space>
		</div>
	);
}

export default UpdateName;
