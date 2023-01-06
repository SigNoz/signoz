/* eslint-disable prefer-regex-literals */
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, notification, Typography } from 'antd';
import { useForm } from 'antd/es/form/Form';
import createDomainApi from 'api/SAML/postDomain';
import { FeatureKeys } from 'constants/featureKeys';
import useFeatureFlag from 'hooks/useFeatureFlag';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { Container } from '../styles';

function AddDomain({ refetch }: Props): JSX.Element {
	const { t } = useTranslation(['common', 'organizationsettings']);
	const [isAddDomains, setIsDomain] = useState(false);
	const [form] = useForm<FormProps>();
	const SSOFlag = useFeatureFlag(FeatureKeys.SSO);

	const { org } = useSelector<AppState, AppReducer>((state) => state.app);

	const onCreateHandler = async (): Promise<void> => {
		try {
			const response = await createDomainApi({
				name: form.getFieldValue('domain'),
				orgId: (org || [])[0].id,
			});

			if (response.statusCode === 200) {
				notification.success({
					message: 'Your domain has been added successfully.',
					duration: 15,
				});
				setIsDomain(false);
				refetch();
			} else {
				notification.error({
					message: t('common:something_went_wrong'),
				});
			}
		} catch (error) {
			notification.error({
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
				{SSOFlag && (
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
				visible={isAddDomains}
				destroyOnClose
				onCancel={(): void => setIsDomain(false)}
			>
				<Form form={form} onFinish={onCreateHandler}>
					<Form.Item
						required
						requiredMark
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
