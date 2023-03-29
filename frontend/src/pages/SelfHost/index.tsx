import { Col, Row } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import SelfHostForm from './SelfHostForm';
import { HeaderSection, ListItem, Title } from './styles';

function SelfHost(): JSX.Element {
	const { t } = useTranslation(['selfhost']);

	return (
		<>
			<HeaderSection />
			<Row gutter={100} align="middle" justify="center">
				<Col>
					<Title>
						SigNoz <span>{t('enterprise')}</span>
					</Title>
					<ListItem>- {t('self_host_list_1')}</ListItem>
					<ListItem>- {t('self_host_list_2')}</ListItem>
					<ListItem>- {t('self_host_list_3')}</ListItem>
					<ListItem>- {t('self_host_list_4')}</ListItem>
					<ListItem>- {t('self_host_list_5')}</ListItem>
					<ListItem>- {t('self_host_list_6')}</ListItem>
				</Col>
				<Col>
					<SelfHostForm />
				</Col>
			</Row>
		</>
	);
}

export default SelfHost;
