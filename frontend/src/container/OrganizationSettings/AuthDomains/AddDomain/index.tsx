/* eslint-disable prefer-regex-literals */
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Typography } from 'antd';
import { useForm } from 'antd/es/form/Form';
import createDomainApi from 'api/SAML/postDomain';
import { FeatureKeys } from 'constants/features';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Container } from '../styles';

function AddDomain({ refetch }: Props): JSX.Element {
	const { t } = useTranslation(['common', 'organizationsettings']);
	const [isAddDomains, setIsDomain] = useState(false);
	const [form] = useForm<FormProps>();
	const { featureFlags, org } = useAppContext();
	const isSsoFlagEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.SSO)?.active || false;

	const { notifications } = useNotifications();

	const onCreateHandler = async (): Promise<void> => {
		try {
			const response = await createDomainApi({
				name: form.getFieldValue('domain'),
				orgId: (org || [])[0].id,
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Your domain has been added successfully.',
					duration: 15,
				});
				setIsDomain(false);
				refetch();
			} else {
				notifications.error({
					message: t('common:something_went_wrong'),
				});
			}
		} catch (error) {
			notifications.error({
				message: t('common:something_went_wrong'),
			});
		}
	};

	return (
		<>
			<Container>
				<Typography.Title level={3}>
					{t('authenticated_domains', {
						ns: 'organizationsettings',
					})}
				</Typography.Title>
				{isSsoFlagEnabled && (
					<Button
						onClick={(): void => setIsDomain(true)}
						type="primary"
						icon={<PlusOutlined />}
					>
						{t('add_domain', { ns: 'organizationsettings' })}
					</Button>
				)}
			</Container>
			<Modal
				centered
				title="Add Domain"
				footer={null}
				open={isAddDomains}
				destroyOnClose
				onCancel={(): void => setIsDomain(false)}
			>
				<Form form={form} onFinish={onCreateHandler} requiredMark>
					<Form.Item
						required
						name={['domain']}
						rules={[
							{
								message: 'Please enter a valid domain',
								required: true,
								pattern: new RegExp(
									'^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$',
								),
							},
						]}
					>
						<Input placeholder="signoz.io" />
					</Form.Item>
					<Form.Item>
						<Button type="primary" htmlType="submit">
							Add Domain
						</Button>
					</Form.Item>
				</Form>
			</Modal>
		</>
	);
}

interface FormProps {
	domain: string;
}

interface Props {
	refetch: () => void;
}

export default AddDomain;
