import { Button, Card, Form, Typography } from 'antd';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { InputComponent } from './styles';

const { Title } = Typography;

function Version(): JSX.Element {
	const [form] = Form.useForm();

	const onClickUpgradeHandler = useCallback((link: string) => {
		window.open(link, '_blank');
	}, []);

	const { currentVersion, latestVersion } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	return (
		<Card>
			<Title ellipsis level={4}>
				Version
			</Title>

			<Form
				wrapperCol={{
					span: 14,
				}}
				labelCol={{
					span: 5,
				}}
				layout="horizontal"
				form={form}
				labelAlign="left"
			>
				<Form.Item label="Your version">
					<InputComponent
						readOnly
						value={currentVersion}
						placeholder="Your Version"
					/>
				</Form.Item>

				<Form.Item label="Latest version">
					<InputComponent
						readOnly
						value={latestVersion}
						placeholder="Latest version"
					/>
					<Button
						onClick={(): void =>
							onClickUpgradeHandler('https://github.com/SigNoz/signoz/releases')
						}
						type="link"
					>
						Release Notes
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
				Read instructions on how to upgrade
			</Button>
		</Card>
	);
}

export default Version;
