import './DataSource.styles.scss';

import { Form, Input, Select } from 'antd';
import cx from 'classnames';
import { useOnboardingContext } from 'container/OnboardingContainer/OnboardingContext';
import { getDataSources } from 'container/OnboardingContainer/utils/dataSourceUtils';
import { useEffect, useState } from 'react';

export interface DataSourceType {
	name: string;
	imgURL: string;
}

export default function DataSource(): JSX.Element {
	const [form] = Form.useForm();

	const { serviceName } = useOnboardingContext();

	const [supportedDataSources, setSupportedDataSources] = useState<
		DataSourceType[]
	>([]);
	const [supportedframeworks, setSupportedframeworks] = useState<
		DataSourceType[]
	>([]);

	useEffect(() => {
		const dataSource = getDataSources('APM');

		setSupportedDataSources(dataSource);
		// const frameworks = getFrameworks();
	}, []);

	console.log('serviceName', serviceName);

	return (
		<div className="apm-module-container">
			<div className="supported-languages-container">
				{supportedDataSources?.map((dataSource) => (
					<div
						className={cx(
							'supported-language',
							// selectedLanguage === supportedLanguage.name ? 'selected' : '',
						)}
						key={dataSource.name}
						// onClick={(): void => setSelectedLanguage(supportedLanguage.name)}
					>
						<img
							className={cx('supported-langauge-img')}
							src={`/Logos/${dataSource.name}.png`}
							alt=""
						/>
					</div>
				))}
			</div>

			<div className="form-container">
				<div className="service-name-container">
					<Form
						initialValues={{
							serviceName,
						}}
						form={form}
						name="service-name"
						style={{ minWidth: '300px' }}
						layout="vertical"
					>
						<Form.Item
							hasFeedback
							name="serviceName"
							label="Service Name"
							rules={[{ required: true }]}
							validateTrigger="onBlur"
						>
							<Input autoFocus />
						</Form.Item>

						<div className="framework-selector">
							<Form.Item label="Select Framework">
								<Select
									// getPopupContainer={popupContainer}
									defaultValue="Django"
									style={{ minWidth: 120 }}
									placeholder="Select Framework"
									// onChange={(value): void => handleFrameworkChange(value)}
									options={supportedframeworks}
								/>
							</Form.Item>
						</div>
					</Form>
				</div>
			</div>
		</div>
	);
}
