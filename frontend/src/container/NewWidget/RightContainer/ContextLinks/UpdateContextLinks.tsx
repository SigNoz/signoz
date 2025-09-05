import './UpdateContextLinks.styles.scss';

import {
	Button,
	Col,
	Form,
	Input as AntInput,
	Input,
	Row,
	Typography,
} from 'antd';
import { CONTEXT_LINK_FIELDS } from 'container/NewWidget/RightContainer/ContextLinks/constants';
import {
	getInitialValues,
	getUrlParams,
	transformContextVariables,
	updateUrlWithParams,
} from 'container/NewWidget/RightContainer/ContextLinks/utils';
import useContextVariables from 'hooks/dashboard/useContextVariables';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ContextLinkProps, Widgets } from 'types/api/dashboard/getAll';

import VariablesDropdown from './VariablesDropdown';

const { TextArea } = AntInput;

interface UpdateContextLinksProps {
	selectedContextLink: ContextLinkProps | null;
	onSave: (newContextLink: ContextLinkProps) => void;
	onCancel: () => void;
	selectedWidget?: Widgets;
}

function UpdateContextLinks({
	selectedContextLink,
	onSave,
	onCancel,
	selectedWidget,
}: UpdateContextLinksProps): JSX.Element {
	const [form] = Form.useForm();
	// const label = Form.useWatch(CONTEXT_LINK_FIELDS.LABEL, form);
	const url = Form.useWatch(CONTEXT_LINK_FIELDS.URL, form);

	const [params, setParams] = useState<
		{
			key: string;
			value: string;
		}[]
	>([]);

	// Extract field variables from the widget's query (all groupBy fields from all queries)
	const fieldVariables = useMemo(() => {
		if (!selectedWidget?.query?.builder?.queryData) return {};

		const fieldVars: Record<string, string | number | boolean> = {};

		// Get all groupBy fields from all queries
		selectedWidget.query.builder.queryData.forEach((queryData) => {
			if (queryData.groupBy) {
				queryData.groupBy.forEach((field) => {
					if (field.key && !(field.key in fieldVars)) {
						fieldVars[field.key] = ''; // Placeholder value
					}
				});
			}
		});

		return fieldVars;
	}, [selectedWidget?.query]);

	// Use useContextVariables to get dashboard, global, and field variables
	const { variables } = useContextVariables({
		maxValues: 2,
		customVariables: fieldVariables,
	});

	// Transform variables into the format expected by VariablesDropdown
	const transformedVariables = useMemo(
		() => transformContextVariables(variables),
		[variables],
	);

	// Function to get current domain
	const getCurrentDomain = (): string => window.location.origin;

	// Function to handle variable selection from dropdown
	const handleVariableSelect = (
		variableName: string,
		cursorPosition?: number,
	): void => {
		// Get current URL value from form
		const currentValue = form.getFieldValue(CONTEXT_LINK_FIELDS.URL) || '';

		// Insert at cursor position if provided, otherwise append to end
		const newValue =
			cursorPosition !== undefined
				? currentValue.slice(0, cursorPosition) +
				  variableName +
				  currentValue.slice(cursorPosition)
				: currentValue + variableName;

		// Update form value
		form.setFieldValue(CONTEXT_LINK_FIELDS.URL, newValue);
	};

	// Function to handle variable selection for parameter values
	const handleParamChange = (
		index: number,
		field: 'key' | 'value',
		value: string,
	): void => {
		const newParams = [...params];
		newParams[index][field] = value;
		setParams(newParams);
		const updatedUrl = updateUrlWithParams(url, newParams);
		form.setFieldValue(CONTEXT_LINK_FIELDS.URL, updatedUrl);
	};

	const handleParamVariableSelect = (
		index: number,
		variableName: string,
		cursorPosition?: number,
	): void => {
		// Get current parameter value
		const currentValue = params[index].value;

		// Insert at cursor position if provided, otherwise append to end
		const newValue =
			cursorPosition !== undefined
				? currentValue.slice(0, cursorPosition) +
				  variableName +
				  currentValue.slice(cursorPosition)
				: currentValue + variableName;

		// Update the parameter value
		handleParamChange(index, 'value', newValue);
	};

	useEffect(() => {
		((window as unknown) as Record<string, unknown>).form = form;
	}, [form]);

	// Parse URL and update params when URL changes
	useEffect(() => {
		if (url) {
			const urlParams = getUrlParams(url);
			setParams(urlParams);
		}
	}, [url]);

	const handleSave = async (): Promise<void> => {
		try {
			// Validate form fields
			await form.validateFields();
			const newContextLink = {
				id: form.getFieldValue(CONTEXT_LINK_FIELDS.ID),
				label:
					form.getFieldValue(CONTEXT_LINK_FIELDS.LABEL) ||
					form.getFieldValue(CONTEXT_LINK_FIELDS.URL),
				url: form.getFieldValue(CONTEXT_LINK_FIELDS.URL),
			};
			// If validation passes, call onSave
			onSave(newContextLink);
		} catch (error) {
			// Form validation failed, don't call onSave
			console.log('Form validation failed:', error);
		}
	};

	const handleAddUrlParameter = (): void => {
		const isLastParamEmpty =
			params.length > 0 &&
			params[params.length - 1].key.trim() === '' &&
			params[params.length - 1].value.trim() === '';
		const canAddParam = params.length === 0 || !isLastParamEmpty;

		if (canAddParam) {
			const newParams = [
				...params,
				{
					key: '',
					value: '',
				},
			];
			setParams(newParams);
			const updatedUrl = updateUrlWithParams(url, newParams);
			form.setFieldValue(CONTEXT_LINK_FIELDS.URL, updatedUrl);
		}
	};

	const handleDeleteParameter = (index: number): void => {
		const newParams = params.filter((_, i) => i !== index);
		setParams(newParams);
		const updatedUrl = updateUrlWithParams(url, newParams);
		form.setFieldValue(CONTEXT_LINK_FIELDS.URL, updatedUrl);
	};

	return (
		<div className="context-link-form-container">
			<div>
				<Form
					form={form}
					name="contextLink"
					initialValues={getInitialValues(selectedContextLink)}
					// onFinish={() => {}}
				>
					{/* //label */}
					<Typography.Text className="form-label">Label</Typography.Text>
					<Form.Item
						name={CONTEXT_LINK_FIELDS.LABEL}
						rules={[{ required: false, message: 'Please input the label' }]}
					>
						<Input placeholder="View Traces details: {{_traceId}}" />
					</Form.Item>
					{/* //url */}
					<Typography.Text className="form-label">
						URL <span className="required-asterisk">*</span>
					</Typography.Text>
					<Form.Item
						name={CONTEXT_LINK_FIELDS.URL}
						// label="URL"
						rules={[
							{ required: true, message: 'Please input the URL' },
							{
								pattern: /^(https?:\/\/|\/|{{.*}}\/)/,
								message: 'URLs must start with http(s), /, or {{.*}}/',
							},
						]}
					>
						<VariablesDropdown
							onVariableSelect={handleVariableSelect}
							variables={transformedVariables}
						>
							{({ setIsOpen, setCursorPosition }): JSX.Element => (
								<div className="url-input-trigger">
									<Input
										value={url}
										onChange={(e): void => {
											setCursorPosition(e.target.selectionStart || 0);
											form.setFieldValue(CONTEXT_LINK_FIELDS.URL, e.target.value);
										}}
										onFocus={(): void => setIsOpen(true)}
										// eslint-disable-next-line sonarjs/no-identical-functions
										onClick={(e): void =>
											setCursorPosition((e.target as HTMLInputElement).selectionStart || 0)
										}
										// eslint-disable-next-line sonarjs/no-identical-functions
										onKeyUp={(e): void =>
											setCursorPosition((e.target as HTMLInputElement).selectionStart || 0)
										}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck="false"
										className="url-input-field"
										placeholder={`${getCurrentDomain()}/trace/{{_traceId}}`}
									/>
								</div>
							)}
						</VariablesDropdown>
					</Form.Item>

					{/* Remove the separate variables section */}
				</Form>

				<div className="params-container">
					{/* URL Parameters Section */}
					{params.length > 0 && (
						<div className="url-parameters-section">
							<Row gutter={[8, 8]} className="parameter-header">
								<Col span={6}>Key</Col>
								<Col span={16}>Value</Col>
								<Col span={2}>{/* Empty column for spacing */}</Col>
							</Row>

							{params.map((param, index) => (
								// eslint-disable-next-line react/no-array-index-key
								<Row gutter={[8, 8]} key={index} className="parameter-row">
									<Col span={6}>
										<Input
											id={`param-key-${index}`}
											placeholder="Key"
											value={param.key}
											onChange={(e): void =>
												handleParamChange(index, 'key', e.target.value)
											}
										/>
									</Col>
									<Col span={16}>
										<VariablesDropdown
											onVariableSelect={(variableName, cursorPosition): void =>
												handleParamVariableSelect(index, variableName, cursorPosition)
											}
											variables={transformedVariables}
										>
											{({ setIsOpen, setCursorPosition }): JSX.Element => (
												<TextArea
													rows={1}
													placeholder="Value"
													value={param.value}
													onChange={(event): void => {
														setCursorPosition(event.target.selectionStart || 0);
														handleParamChange(index, 'value', event.target.value);
													}}
													onFocus={(): void => setIsOpen(true)}
													// eslint-disable-next-line sonarjs/no-identical-functions
													onClick={(e): void =>
														setCursorPosition(
															(e.target as HTMLTextAreaElement).selectionStart || 0,
														)
													}
													// eslint-disable-next-line sonarjs/no-identical-functions
													onKeyUp={(e): void =>
														setCursorPosition(
															(e.target as HTMLTextAreaElement).selectionStart || 0,
														)
													}
												/>
											)}
										</VariablesDropdown>
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
				</div>

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

			{/* Footer with Cancel and Save buttons */}
			<div className="context-link-footer">
				<Button onClick={onCancel}>Cancel</Button>
				<Button type="primary" onClick={handleSave}>
					Save
				</Button>
			</div>
		</div>
	);
}

UpdateContextLinks.defaultProps = {
	selectedWidget: undefined,
};

export default UpdateContextLinks;
