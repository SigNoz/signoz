/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './DataSource.styles.scss';

import { Card, Form, Input, Select, Typography } from 'antd';
import cx from 'classnames';
import { useOnboardingContext } from 'container/OnboardingContainer/context/OnboardingContext';
import {
	getDataSources,
	getSupportedFrameworks,
	hasFrameworks,
} from 'container/OnboardingContainer/utils/dataSourceUtils';
import { useEffect, useState } from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

export interface DataSourceType {
	name: string;
	imgURL: string;
}

export default function DataSource(): JSX.Element {
	const [form] = Form.useForm();

	const {
		serviceName,
		selectedModule,
		selectedDataSource,
		updateSelectedDataSource,
	} = useOnboardingContext();

	const [supportedDataSources, setSupportedDataSources] = useState<
		DataSourceType[]
	>([]);
	const [supportedframeworks, setSupportedframeworks] = useState<
		DataSourceType[]
	>([]);

	const [enableFrameworks, setEnableFrameworks] = useState(false);

	useEffect(() => {
		if (selectedModule) {
			const dataSource = getDataSources(selectedModule);

			setSupportedDataSources(dataSource);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (selectedModule && selectedDataSource) {
			const frameworks = hasFrameworks({
				module: selectedModule,
				dataSource: selectedDataSource,
			});

			if (frameworks) {
				setEnableFrameworks(true);
				setSupportedframeworks(
					getSupportedFrameworks({
						module: selectedModule,
						dataSource: selectedDataSource,
					}),
				);
			} else {
				setEnableFrameworks(false);
			}
		}
	}, [selectedModule, selectedDataSource]);

	console.log(
		'selectedDataSource',
		selectedModule,
		selectedDataSource,
		supportedframeworks,
	);

	return (
		<div className="apm-module-container">
			<div className="supported-languages-container">
				{supportedDataSources?.map((dataSource) => (
					<Card
						className={cx(
							'supported-language',
							selectedDataSource?.name === dataSource.name ? 'selected' : '',
						)}
						key={dataSource.name}
						onClick={(): void => {
							updateSelectedDataSource(dataSource);
						}}
					>
						<div>
							<img
								className={cx('supported-langauge-img')}
								src={dataSource.imgURL}
								alt=""
							/>
						</div>

						<div>
							<Typography.Text className="source-name">
								{' '}
								{dataSource.name}{' '}
							</Typography.Text>
						</div>
					</Card>
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

						{enableFrameworks && (
							<div className="framework-selector">
								<Form.Item label="Select Framework">
									<Select
										getPopupContainer={popupContainer}
										style={{ minWidth: 120 }}
										placeholder="Select Framework"
										// onChange={(value): void => handleFrameworkChange(value)}
										options={supportedframeworks}
									/>
								</Form.Item>
							</div>
						)}
					</Form>
				</div>
			</div>
		</div>
	);
}
