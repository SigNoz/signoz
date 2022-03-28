import { Button, Card, Form, Typography } from 'antd';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { InputComponent } from './styles';

const { Title } = Typography;

function Version(): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation();

	const onClickUpgradeHandler = useCallback((link: string) => {
		window.open(link, '_blank');
	}, []);

	const { currentVersion, latestVersion } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	return (
		<Card>
			<Title ellipsis level={4}>
				{t('version')}
			</Title>

			<Form
				wrapperCol={{
					span: 14,
				}}
				labelCol={{
					span: 3,
				}}
				layout="horizontal"
				form={form}
				labelAlign="left"
			>
				<Form.Item label={t('current_version')}>
					<InputComponent
						readOnly
						value={currentVersion}
						placeholder={t('current_version')}
					/>
				</Form.Item>

				<Form.Item label={t('latest_version')}>
					<InputComponent
						readOnly
						value={latestVersion}
						placeholder={t('latest_version')}
					/>
					<Button
						onClick={(): void =>
							onClickUpgradeHandler('https://github.com/SigNoz/signoz/releases')
						}
						type="link"
					>
						{t('release_notes')}
					</Button>
				</Form.Item>
			</Form>

			<Button
				onClick={(): void =>
					onClickUpgradeHandler(
						'https://signoz.io/docs/operate/docker-standalone/#upgrade',
					)
				}
			>
				{t('read_how_to_upgrade')}
			</Button>
		</Card>
	);
}

export default Version;
