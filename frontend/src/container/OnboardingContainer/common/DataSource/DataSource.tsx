import './DataSource.styles.scss';

import { Form, Input, Select } from 'antd';
import cx from 'classnames';

const supportedLanguages = [
	{
		name: 'java',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'python',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'javascript',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'go',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'rails',
		imgURL: `Logos/rails.png`,
	},
];

const frameworksMap = {
	django: 'Django',
	fastAPI: 'Fast API',
	flask: 'Flask',
	falcon: 'Falcon',
	other: 'Others',
};

export default function DataSource(): JSX.Element {
	const [form] = Form.useForm();

	return (
		<div className="apm-module-container">
			<div className="supported-languages-container">
				{supportedLanguages.map((supportedLanguage) => (
					<div
						className={cx(
							'supported-language',
							// selectedLanguage === supportedLanguage.name ? 'selected' : '',
						)}
						key={supportedLanguage.name}
						// onClick={(): void => setSelectedLanguage(supportedLanguage.name)}
					>
						<img
							className={cx('supported-langauge-img')}
							src={`/Logos/${supportedLanguage.name}.png`}
							alt=""
						/>
					</div>
				))}
			</div>

			<div className="form-container">
				<div className="service-name-container">
					<Form
						form={form}
						name="service-name"
						style={{ minWidth: '300px' }}
						layout="vertical"
					>
						<Form.Item
							hasFeedback
							name="Service Name"
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
									options={[
										{
											value: 'django',
											label: frameworksMap.django,
										},
										{
											value: 'fastAPI',
											label: frameworksMap.fastAPI,
										},
										{
											value: 'flask',
											label: frameworksMap.flask,
										},
										{
											value: 'falcon',
											label: frameworksMap.falcon,
										},
										{
											value: 'other',
											label: frameworksMap.other,
										},
									]}
								/>
							</Form.Item>
						</div>
					</Form>
				</div>
			</div>
		</div>
	);
}
