import { Button, Input, notification, Space, Typography } from 'antd';
import editOrg from 'api/user/editOrg';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_ORG_NAME } from 'types/actions/app';
import AppReducer, { User } from 'types/reducer/app';

function DisplayName({
	index,
	id: orgId,
	isAnonymous,
}: DisplayNameProps): JSX.Element {
	const { t } = useTranslation(['organizationsettings', 'common']);
	const { org } = useSelector<AppState, AppReducer>((state) => state.app);
	const { name } = (org || [])[index];
	const [orgName, setOrgName] = useState<string>(name);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const onClickHandler = async (): Promise<void> => {
		try {
			setIsLoading(true);
			const { statusCode, error } = await editOrg({
				isAnonymous,
				name: orgName,
				orgId,
			});
			if (statusCode === 200) {
				notification.success({
					message: t('success', {
						ns: 'common',
					}),
				});
				dispatch({
					type: UPDATE_ORG_NAME,
					payload: {
						orgId,
						name: orgName,
					},
				});
			} else {
				notification.error({
					message:
						error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notification.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};

	if (!org) {
		return <div />;
	}

	return (
		<Space direction="vertical">
			<Typography.Title level={3}>{t('display_name')}</Typography.Title>
			<Space direction="vertical" size="middle">
				<Input
					value={orgName}
					onChange={(e): void => setOrgName(e.target.value)}
					size="large"
					placeholder={t('signoz')}
					disabled={isLoading}
				/>
				<Button
					onClick={onClickHandler}
					disabled={isLoading}
					loading={isLoading}
					type="primary"
				>
					Change Org Name
				</Button>
			</Space>
		</Space>
	);
}

interface DisplayNameProps {
	index: number;
	id: User['userId'];
	isAnonymous: boolean;
}

export default DisplayName;
