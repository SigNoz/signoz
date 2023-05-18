import { Button, Form, Input } from 'antd';
import editOrg from 'api/user/editOrg';
import { useNotifications } from 'hooks/useNotifications';
import { useState } from 'react';
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
	const [form] = Form.useForm();

	const { t } = useTranslation(['organizationsettings', 'common']);
	const { org } = useSelector<AppState, AppReducer>((state) => state.app);
	const { name } = (org || [])[index];
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const { notifications } = useNotifications();

	const onSubmit = async ({ name: orgName }: OnSubmitProps): Promise<void> => {
		try {
			setIsLoading(true);
			const { statusCode, error } = await editOrg({
				isAnonymous,
				name: orgName,
				orgId,
			});
			if (statusCode === 200) {
				notifications.success({
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
				notifications.error({
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
			notifications.error({
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
		<Form
			initialValues={{ name }}
			form={form}
			layout="vertical"
			onFinish={onSubmit}
			autoComplete="off"
		>
			<Form.Item name="name" label="Display name" rules={[{ required: true }]}>
				<Input size="large" placeholder={t('signoz')} disabled={isLoading} />
			</Form.Item>
			<Form.Item>
				<Button loading={isLoading} type="primary" htmlType="submit">
					Submit
				</Button>
			</Form.Item>
		</Form>
	);
}

interface DisplayNameProps {
	index: number;
	id: User['userId'];
	isAnonymous: boolean;
}

interface OnSubmitProps {
	name: string;
}

export default DisplayName;
