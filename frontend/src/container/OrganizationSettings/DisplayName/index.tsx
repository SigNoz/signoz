import { Button, Form, Input } from 'antd';
import editOrg from 'api/user/editOrg';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { IUser } from 'providers/App/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requireErrorMessage } from 'utils/form/requireErrorMessage';

function DisplayName({
	index,
	id: orgId,
	isAnonymous,
}: DisplayNameProps): JSX.Element {
	const [form] = Form.useForm<FormValues>();
	const orgName = Form.useWatch('name', form);

	const { t } = useTranslation(['organizationsettings', 'common']);
	const { org, updateOrg } = useAppContext();
	const { name } = (org || [])[index];
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const { notifications } = useNotifications();

	const onSubmit = async (values: FormValues): Promise<void> => {
		try {
			setIsLoading(true);
			const { name } = values;
			const { statusCode, error } = await editOrg({
				isAnonymous,
				name,
				orgId,
			});
			if (statusCode === 200) {
				notifications.success({
					message: t('success', {
						ns: 'common',
					}),
				});
				updateOrg(orgId, name);
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

	const isDisabled = isLoading || orgName === name || !orgName;

	return (
		<Form
			initialValues={{ name }}
			form={form}
			layout="vertical"
			onFinish={onSubmit}
			autoComplete="off"
		>
			<Form.Item
				name="name"
				label="Display name"
				rules={[{ required: true, message: requireErrorMessage('Display name') }]}
			>
				<Input size="large" placeholder={t('signoz')} />
			</Form.Item>
			<Form.Item>
				<Button
					loading={isLoading}
					disabled={isDisabled}
					type="primary"
					htmlType="submit"
				>
					Submit
				</Button>
			</Form.Item>
		</Form>
	);
}

interface DisplayNameProps {
	index: number;
	id: IUser['id'];
	isAnonymous: boolean;
}

interface FormValues {
	name: string;
}

export default DisplayName;
