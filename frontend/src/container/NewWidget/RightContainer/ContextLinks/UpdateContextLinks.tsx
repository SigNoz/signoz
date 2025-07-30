import './UpdateContextLinks.styles.scss';

import { Button, Col, Form, Input, Row } from 'antd';
import { CONTEXT_LINK_FIELDS } from 'container/NewWidget/RightContainer/ContextLinks/constants';
import { getInitialValues } from 'container/NewWidget/RightContainer/ContextLinks/utils';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ContextLinkProps } from 'types/api/dashboard/getAll';

interface UpdateContextLinksProps {
	selectedContextLink: ContextLinkProps | null;
}

function UpdateContextLinks({
	selectedContextLink,
}: UpdateContextLinksProps): JSX.Element {
	const [form] = Form.useForm();
	const label = Form.useWatch(CONTEXT_LINK_FIELDS.LABEL, form);
	const url = Form.useWatch(CONTEXT_LINK_FIELDS.URL, form);

	const [params, setParams] = useState<
		{
			key: string;
			value: string;
		}[]
	>([]);

	console.log('FORM VALUES', { label, url });
	useEffect(() => {
		((window as unknown) as Record<string, unknown>).form = form;
	}, [form]);

	const handleAddUrlParameter = (): void => {
		const isLastParamEmpty =
			params.length > 0 &&
			params[params.length - 1].key.trim() === '' &&
			params[params.length - 1].value.trim() === '';
		const canAddParam = params.length === 0 || !isLastParamEmpty;

		if (canAddParam) {
			setParams([
				...params,
				{
					key: '',
					value: '',
				},
			]);
		}
	};

	const handleDeleteParameter = (index: number): void => {
		setParams(params.filter((_, i) => i !== index));
	};

	const handleParamChange = (
		index: number,
		field: 'key' | 'value',
		value: string,
	): void => {
		const newParams = [...params];
		newParams[index][field] = value;
		setParams(newParams);
	};

	return (
		<div className="context-link-form-container">
			<Form
				form={form}
				name="contextLink"
				initialValues={getInitialValues(selectedContextLink)}
				// onFinish={() => {}}
			>
				{/* //label */}
				<Form.Item
					name={CONTEXT_LINK_FIELDS.LABEL}
					label="Label"
					rules={[{ required: false, message: 'Please input the label' }]}
				>
					<Input />
				</Form.Item>
				{/* //url */}
				<Form.Item
					name={CONTEXT_LINK_FIELDS.URL}
					label="URL"
					rules={[
						{ required: true, message: 'Please input the URL' },
						{
							pattern: /^(https?:\/\/|\/|{{.*}}\/)/,
							message: 'URLs must start with http(s), /, or {{.*}}/',
						},
					]}
				>
					<Input />
				</Form.Item>
			</Form>

			{/* URL Parameters Section */}
			{params.length > 0 && (
				<div className="url-parameters-section">
					<Row gutter={[8, 8]} className="parameter-header">
						<Col span={11}>
							<strong>Key</strong>
						</Col>
						<Col span={11}>
							<strong>Value</strong>
						</Col>
						<Col span={2}>{/* Empty column for spacing */}</Col>
					</Row>

					{params.map((param, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<Row gutter={[8, 8]} key={index} className="parameter-row">
							<Col span={11}>
								<Input
									placeholder="Key"
									value={param.key}
									onChange={(e): void => handleParamChange(index, 'key', e.target.value)}
								/>
							</Col>
							<Col span={11}>
								<Input
									placeholder="Value"
									value={param.value}
									onChange={(e): void =>
										handleParamChange(index, 'value', e.target.value)
									}
								/>
							</Col>
							<Col span={2}>
								<Button
									type="text"
									icon={<Trash2 size={14} />}
									onClick={(): void => handleDeleteParameter(index)}
									className="delete-parameter-btn"
								/>
							</Col>
						</Row>
					))}
				</div>
			)}

			{/* Add URL parameter btn */}
			<Button
				type="primary"
				className="add-url-parameter-btn"
				icon={<Plus size={12} />}
				onClick={handleAddUrlParameter}
			>
				Add URL parameter
			</Button>
		</div>
	);
}

export default UpdateContextLinks;
