import {
	ChangeEvent,
	Dispatch,
	SetStateAction,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Collapse, Form, Input, Radio, Select, Space } from 'antd';
import {
	fetchJiraProjectIssueTypes,
	fetchJiraProjects,
} from 'api/channels/jiraProjects';
import jiraMetadata from 'api/channels/jiraMetadata';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import { JiraFieldMetadata } from 'types/api/channels/jiraMetadata';
import { JiraIssueType, JiraProject } from 'types/api/channels/jiraProjects';

import { JiraChannel } from '../../CreateAlertChannels/config';

const { TextArea } = Input;

function JiraSettings({ setSelectedConfig, selectedConfig }: JiraSettingsProps): JSX.Element {
	const { t } = useTranslation('channels');

	const standardFieldIds = useMemo(
		() => new Set(['summary', 'description', 'project', 'issuetype', 'priority', 'labels']),
		[],
	);

	type FieldMode = 'none' | 'text' | 'select' | 'json';

	type CustomFieldRow = {
		label: string;
		fieldId: string;
		value: string | string[];
		mode: FieldMode;
		allowedValues?: string[];
		schemaType?: string;
		schemaItems?: string;
		schemaSystem?: string;
		schemaCustom?: string;
		schemaCustomId?: number;
		required?: boolean;
		fromMetadata?: boolean;
		touched?: boolean;
	};

	const [customFieldRows, setCustomFieldRows] = useState<CustomFieldRow[]>([]);
	const [customFieldErrors, setCustomFieldErrors] = useState<Record<number, string>>({});
	const [customFieldsInitialized, setCustomFieldsInitialized] = useState(false);
	const [metadataError, setMetadataError] = useState('');
	const [projects, setProjects] = useState<JiraProject[]>([]);
	const [issueTypes, setIssueTypes] = useState<JiraIssueType[]>([]);
	const [projectsLoading, setProjectsLoading] = useState(false);
	const [issueTypesLoading, setIssueTypesLoading] = useState(false);
	const [projectsError, setProjectsError] = useState('');
	const [issueTypesError, setIssueTypesError] = useState('');
	const [selectedProjectKey, setSelectedProjectKey] = useState('');

	const handleInputChange =
		(field: string) =>
		(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
			setSelectedConfig((value) => ({
				...value,
				[field]: event.target.value,
			}));
		};

	const extractCustomFieldValue = (value: unknown): { value: string | string[]; mode: FieldMode } => {
		if (Array.isArray(value)) {
			const allStrings = value.every((item) => typeof item === 'string');
			if (allStrings) {
				return { value: value as string[], mode: 'text' };
			}
			return { value: JSON.stringify(value), mode: 'json' };
		}
		if (value && typeof value === 'object') {
			if ('value' in (value as Record<string, unknown>)) {
				const raw = (value as Record<string, unknown>).value;
				if (typeof raw === 'string') {
					return { value: raw, mode: 'text' };
				}
			}
			return { value: JSON.stringify(value), mode: 'json' };
		}
		return { value: typeof value === 'string' ? value : '', mode: 'text' };
	};

	const hasFieldValue = (value: string | string[]): boolean => {
		if (Array.isArray(value)) {
			return value.some((item) => String(item).trim() !== '');
		}
		return String(value).trim() !== '';
	};

	const isSelectField = (field: JiraFieldMetadata): boolean => {
		if (field.allowed_values && field.allowed_values.length > 0) {
			return true;
		}
		if (field.schema_type === 'array') {
			return field.schema_items === 'option' || field.schema_items === 'select';
		}
		return field.schema_type === 'option' || field.schema_type === 'select';
	};

	const isTextField = (field: JiraFieldMetadata): boolean => {
		if (!field.schema_type || field.schema_type === 'string' || field.schema_type === 'text') {
			return true;
		}
		if (field.schema_type === 'array') {
			return field.schema_items === 'string';
		}
		return false;
	};

	const inferDefaultMode = (field: JiraFieldMetadata): FieldMode => {
		if (isSelectField(field)) {
			return 'select';
		}
		if (isTextField(field)) {
			return 'text';
		}
		return 'json';
	};

	const mergeCustomFieldsIntoRows = (
		rows: CustomFieldRow[],
		customFields?: Record<string, unknown>,
	): CustomFieldRow[] => {
		if (!customFields || Object.keys(customFields).length === 0) {
			return rows;
		}

		const existingIds = new Set(rows.map((row) => row.fieldId).filter(Boolean));
		const extraRows = Object.entries(customFields)
			.filter(([fieldId]) => !existingIds.has(fieldId))
			.map(([fieldId, value]) => {
				const extracted = extractCustomFieldValue(value);
				return {
					label: 'Custom field',
					fieldId,
					value: extracted.value,
					mode: extracted.mode,
					fromMetadata: false,
				};
			});

		return [...rows, ...extraRows];
	};

	const resolveMetadataRows = (
		fields: JiraFieldMetadata[],
		customFields?: Record<string, unknown>,
		previousRows?: CustomFieldRow[],
	): CustomFieldRow[] => {
		const metadataRows = fields
			.filter((field) => !standardFieldIds.has(field.id))
			.map((field) => {
				const existingValue = customFields ? customFields[field.id] : undefined;
				const extracted = extractCustomFieldValue(existingValue);
				const hasValue = hasFieldValue(extracted.value);
				const defaultMode = inferDefaultMode(field);
				const mode = hasValue
					? (extracted.mode === 'json' ? 'json' : defaultMode)
					: field.required
					? defaultMode
					: 'none';
				const normalizedValue =
					field.schema_type === 'array' && !Array.isArray(extracted.value)
						? (extracted.value ? [extracted.value] : [])
						: extracted.value;
				return {
					label: field.name,
					fieldId: field.id,
					value: normalizedValue,
					mode,
					allowedValues: field.allowed_values,
					schemaType: field.schema_type,
					schemaItems: field.schema_items,
					schemaSystem: field.schema_system,
					schemaCustom: field.schema_custom,
					schemaCustomId: field.schema_custom_id,
					required: field.required,
					fromMetadata: true,
				};
			});

		const metadataIds = new Set(metadataRows.map((row) => row.fieldId));
		const extraRows = Object.entries(customFields || {})
			.filter(([fieldId]) => !metadataIds.has(fieldId))
			.map(([fieldId, value]) => {
				const extracted = extractCustomFieldValue(value);
				return {
					label: 'Custom field',
					fieldId,
					value: extracted.value,
					mode: extracted.mode,
					fromMetadata: false,
				};
			});

		const manualRows = (previousRows || []).filter(
			(row) => !row.fromMetadata && (row.fieldId.trim() !== '' || String(row.value).trim() !== ''),
		);

		return [...metadataRows, ...extraRows, ...manualRows];
	};

	const buildCustomFields = (rows: CustomFieldRow[]): Record<string, unknown> => {
		const nextErrors: Record<number, string> = {};
		const nextFields: Record<string, unknown> = {};

		rows.forEach((row, index) => {
			if (row.mode === 'none') {
				return;
			}
			const valueString = Array.isArray(row.value) ? row.value.join(',') : row.value;
			const hasValue = String(valueString).trim() !== '';
			const hasFieldId = row.fieldId.trim() !== '';
			if (!hasValue && !hasFieldId) {
				return;
			}
			if (!hasFieldId) {
				if (row.touched) {
					nextErrors[index] = t('jira_custom_field_id_required');
				}
				return;
			}
			if (!hasValue) {
				if (row.touched) {
					nextErrors[index] = t('jira_custom_field_value_required');
				}
				return;
			}
			if (row.mode === 'json') {
				try {
					const parsed = JSON.parse(String(row.value));
					nextFields[row.fieldId.trim()] = parsed;
				} catch (error) {
					if (row.touched) {
						nextErrors[index] = t('jira_custom_field_json_invalid');
					}
					return;
				}
				return;
			}

			if (row.schemaType === 'option' || row.schemaType === 'select') {
				if (Array.isArray(row.value)) {
					nextFields[row.fieldId.trim()] = row.value.map((value) => ({ value }));
				} else {
					nextFields[row.fieldId.trim()] = { value: row.value };
				}
				return;
			}

			if (
				row.schemaType === 'array' &&
				(row.schemaItems === 'option' || row.schemaItems === 'select')
			) {
				const values = Array.isArray(row.value) ? row.value : [row.value];
				nextFields[row.fieldId.trim()] = values
					.filter((value) => String(value).trim() !== '')
					.map((value) => ({ value }));
				return;
			}

			if (row.schemaType === 'array') {
				const values = Array.isArray(row.value) ? row.value : [row.value];
				nextFields[row.fieldId.trim()] = values.filter(
					(value) => String(value).trim() !== '',
				);
				return;
			}

			nextFields[row.fieldId.trim()] = Array.isArray(row.value)
				? row.value.join(',')
				: row.value;
		});

		setCustomFieldErrors(nextErrors);
		return nextFields;
	};

	useEffect(() => {
		if (!customFieldsInitialized) {
			setCustomFieldRows((rows) =>
				mergeCustomFieldsIntoRows(rows, selectedConfig?.custom_fields),
			);
			setCustomFieldsInitialized(true);
		}
	}, [customFieldsInitialized, selectedConfig?.custom_fields]);

	useEffect(() => {
		if (selectedConfig?.project && !selectedProjectKey) {
			setSelectedProjectKey(selectedConfig.project);
		}
	}, [selectedConfig?.project, selectedProjectKey]);

	useEffect(() => {
		const customFields = buildCustomFields(customFieldRows);
		setSelectedConfig((value) => ({
			...value,
			custom_fields: customFields,
		}));
	}, [customFieldRows]);

	const updateCustomFieldRow = (
		index: number,
		patch: Partial<CustomFieldRow>,
	): void => {
		setCustomFieldRows((rows) =>
			rows.map((row, rowIndex) =>
				rowIndex === index ? { ...row, ...patch, touched: true } : row,
			),
		);
	};

	const loadMetadata = async (): Promise<void> => {
		if (!selectedConfig?.api_url || !selectedConfig?.username || !selectedConfig?.password) {
			setMetadataError(t('jira_metadata_missing_auth'));
			return;
		}
		if (!selectedConfig.project || !selectedConfig.issue_type) {
			setMetadataError(t('jira_metadata_missing_project'));
			return;
		}

		setMetadataError('');
		try {
			const response = await jiraMetadata({
				api_url: selectedConfig.api_url,
				api_type: 'auto',
				username: selectedConfig.username,
				password: selectedConfig.password,
				project: selectedConfig.project,
				issue_type: selectedConfig.issue_type,
			});
			const fields = response.data.data?.fields || [];
			setCustomFieldRows((rows) =>
				resolveMetadataRows(fields, selectedConfig?.custom_fields, rows),
			);
		} catch (error) {
			setMetadataError(t('jira_metadata_failed'));
		}
	};

	const loadProjects = async (): Promise<void> => {
		if (!selectedConfig?.api_url || !selectedConfig?.username || !selectedConfig?.password) {
			setProjectsError(t('jira_metadata_missing_auth'));
			return;
		}

		setProjectsLoading(true);
		setProjectsError('');
		try {
			const projectsResponse = await fetchJiraProjects({
				api_url: selectedConfig.api_url,
				username: selectedConfig.username,
				password: selectedConfig.password,
			});
			const loadedProjects = projectsResponse.data.projects || [];
			setProjects(loadedProjects);
		} catch (error) {
			setProjectsError(t('jira_projects_failed'));
		} finally {
			setProjectsLoading(false);
		}
	};

	useEffect(() => {
		if (!selectedConfig?.api_url || !selectedConfig?.username || !selectedConfig?.password) {
			return;
		}
		if (projects.length === 0 && !projectsLoading) {
			void loadProjects();
		}
	}, [selectedConfig?.api_url, selectedConfig?.username, selectedConfig?.password]);

	const loadIssueTypes = async (projectKey: string): Promise<void> => {
		if (!selectedConfig?.api_url || !selectedConfig?.username || !selectedConfig?.password) {
			setIssueTypesError(t('jira_metadata_missing_auth'));
			return;
		}
		if (!projectKey) {
			setIssueTypesError(t('jira_project_missing'));
			return;
		}

		setIssueTypesLoading(true);
		setIssueTypesError('');
		try {
			const response = await fetchJiraProjectIssueTypes({
				api_url: selectedConfig.api_url,
				username: selectedConfig.username,
				password: selectedConfig.password,
				project_key: projectKey,
			});
			const types = response.data.issue_types || [];
			setIssueTypes(types);
		} catch (error) {
			setIssueTypesError(t('jira_issue_types_failed'));
		} finally {
			setIssueTypesLoading(false);
		}
	};

	useEffect(() => {
		const projectKey = selectedProjectKey || selectedConfig?.project || '';
		if (!projectKey) {
			return;
		}
		void loadIssueTypes(projectKey);
	}, [selectedProjectKey, selectedConfig?.project]);

	useEffect(() => {
		if (!selectedConfig?.project || !selectedConfig?.issue_type) {
			return;
		}
		void loadMetadata();
	}, [selectedConfig?.project, selectedConfig?.issue_type]);

	const addCustomFieldRow = (): void => {
		setCustomFieldRows((rows) => [
			...rows,
			{ label: 'Custom field', fieldId: '', value: '', mode: 'text' },
		]);
	};

	const metadataRows = useMemo(
		() =>
			customFieldRows
				.map((row, index) => ({ row, index }))
				.filter(({ row }) => row.fromMetadata),
		[customFieldRows],
	);

	const requiredRows = useMemo(
		() => metadataRows.filter(({ row }) => row.required),
		[metadataRows],
	);

	const optionalRows = useMemo(
		() => metadataRows.filter(({ row }) => !row.required),
		[metadataRows],
	);

	const manualRows = useMemo(
		() =>
			customFieldRows
				.map((row, index) => ({ row, index }))
				.filter(({ row }) => !row.fromMetadata),
		[customFieldRows],
	);

	const getModeOptions = (row: CustomFieldRow): FieldMode[] => {
		const modes: FieldMode[] = [];
		if (!row.required) {
			modes.push('none');
		}
		const hasAllowedValues = row.allowedValues && row.allowedValues.length > 0;
		const isSelect =
			hasAllowedValues ||
			row.schemaType === 'option' ||
			row.schemaType === 'select' ||
			(row.schemaType === 'array' &&
				(row.schemaItems === 'option' || row.schemaItems === 'select'));
		const isText =
			!row.schemaType ||
			row.schemaType === 'string' ||
			row.schemaType === 'text' ||
			(row.schemaType === 'array' && row.schemaItems === 'string');
		if (isSelect) {
			modes.push('select');
		}
		if (isText) {
			modes.push('text');
		}
		modes.push('json');
		return Array.from(new Set(modes));
	};

	const renderSchema = (row: CustomFieldRow): JSX.Element => {
		const schema: Record<string, unknown> = {
			type: row.schemaType || 'string',
		};
		if (row.schemaSystem) {
			schema.system = row.schemaSystem;
		}
		if (row.schemaCustom) {
			schema.custom = row.schemaCustom;
		}
		if (typeof row.schemaCustomId === 'number' && row.schemaCustomId > 0) {
			schema.customId = row.schemaCustomId;
		}
		if (row.schemaItems) {
			schema.items = row.schemaItems;
		}
		if (row.allowedValues && row.allowedValues.length > 0) {
			schema.allowedValues = row.allowedValues;
		}
		return (
			<div style={{ marginTop: 12 }}>
				<div style={{ fontWeight: 600, marginBottom: 4 }}>Schema</div>
				<pre
					style={{
						margin: 0,
						background: 'rgba(255, 255, 255, 0.06)',
						border: '1px solid rgba(255, 255, 255, 0.08)',
						padding: 8,
						borderRadius: 4,
					}}
				>
					{JSON.stringify(schema, null, 2)}
				</pre>
			</div>
		);
	};

	return (
		<>
			<Form.Item
				name="api_url"
				label={t('field_jira_api_url')}
				tooltip={{
					title: (
						<MarkdownRenderer markdownContent={t('tooltip_jira_api_url')} variables={{}} />
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
				required
			>
				<Input
					onChange={handleInputChange('api_url')}
					placeholder="https://your-domain.atlassian.net"
					data-testid="jira-api-url-textbox"
				/>
			</Form.Item>

			<Form.Item 
				name="username" 
				label="Username" 
				help="For Jira Cloud: use your email address (e.g., user@company.com). For Jira Data Center: use your username." 
				required
			>
				<Input 
					onChange={handleInputChange('username')} 
					placeholder="user@company.com or username"
					data-testid="jira-username-textbox" 
				/>
			</Form.Item>

			<Form.Item 
				name="password" 
				label="Password / API Token" 
				help="For Jira Cloud: API token from https://id.atlassian.com/manage-profile/security/api-tokens. For Jira Data Center: Personal Access Token or password." 
				required
			>
				<Input
					type="password"
					onChange={handleInputChange('password')}
					placeholder="API token or password"
					data-testid="jira-password-textbox"
				/>
			</Form.Item>

			<Form.Item name="project" label={t('field_jira_project')} required>
				<Select
					showSearch
					optionFilterProp="label"
					value={selectedProjectKey || selectedConfig?.project}
					loading={projectsLoading}
					onChange={(value): void => {
						setSelectedProjectKey(value);
						setSelectedConfig((current) => ({
							...current,
							project: value,
						}));
						setIssueTypes([]);
						setIssueTypesError('');
					}}
					options={projects.map((project) => ({
						label: `${project.key} - ${project.name}`,
						value: project.key,
					}))}
					placeholder={t('jira_project_placeholder')}
				/>
				{projectsError && <div>{projectsError}</div>}
			</Form.Item>

			<Form.Item name="issue_type" label={t('field_jira_issue_type')} required>
				<Select
					showSearch
					optionFilterProp="label"
					value={selectedConfig?.issue_type}
					loading={issueTypesLoading}
					onChange={(value): void => {
						setSelectedConfig((current) => ({
							...current,
							issue_type: value,
						}));
					}}
					options={issueTypes.map((issueType) => ({
						label: issueType.name,
						value: issueType.name,
					}))}
					placeholder={t('jira_issue_type_placeholder')}
				/>
				{issueTypesError && <div>{issueTypesError}</div>}
			</Form.Item>

			{metadataError && <div>{metadataError}</div>}

			<Form.Item
				name="summary"
				help={t('help_jira_summary')}
				label={t('field_jira_summary')}
				required
			>
				<Input onChange={handleInputChange('summary')} data-testid="jira-summary-textbox" />
			</Form.Item>

			<Form.Item
				name="description"
				help={t('help_jira_description')}
				label={t('field_jira_description')}
				required
			>
				<TextArea
					rows={5}
					onChange={handleInputChange('description')}
					data-testid="jira-description-textarea"
				/>
			</Form.Item>

			<Form.Item name="priority" label={t('field_jira_priority')}>
				<Input onChange={handleInputChange('priority')} data-testid="jira-priority-textbox" />
			</Form.Item>

			<Form.Item
				name="labels"
				help={t('help_jira_labels')}
				label={t('field_jira_labels')}
			>
				<Input onChange={handleInputChange('labels')} data-testid="jira-labels-textbox" />
			</Form.Item>

			<Form.Item
				name="resolve_transition"
				help={t('help_jira_resolve_transition')}
				label={t('field_jira_resolve_transition')}
			>
				<Input
					onChange={handleInputChange('resolve_transition')}
					data-testid="jira-resolve-transition-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="reopen_transition"
				help={t('help_jira_resolve_transition')}
				label={t('field_jira_reopen_transition')}
			>
				<Input
					onChange={handleInputChange('reopen_transition')}
					data-testid="jira-reopen-transition-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="reopen_duration"
				help="Duration to search for resolved issues to reopen (e.g., 7d, 24h, 30m). Leave empty to search all issues (matches Grafana behavior). Only used when Reopen Transition is set."
				label="Reopen Duration"
			>
				<Input
					onChange={handleInputChange('reopen_duration')}
					placeholder="7d"
					data-testid="jira-reopen-duration-textbox"
				/>
			</Form.Item>

			<Form.Item
				label={t('field_jira_custom_fields')}
				help={t('help_jira_custom_fields')}
			>
				<div style={{ marginBottom: 12, fontWeight: 600 }}>Required fields</div>
				<Collapse
					accordion={false}
					items={requiredRows.map(({ row, index }) => ({
						key: row.fieldId || `${row.label}-${index}`,
						label: row.label,
						children: (
							<div>
								<div style={{ marginBottom: 8 }}>Field ID: {row.fieldId}</div>
								<Radio.Group
									value={row.mode}
									onChange={(event): void => {
										updateCustomFieldRow(index, {
											mode: event.target.value as FieldMode,
											value: event.target.value === 'none' ? '' : row.value,
										});
									}}
								>
									<Space size="middle">
										{getModeOptions(row)
											.filter((mode) => mode !== 'none')
											.map((mode) => (
												<Radio key={mode} value={mode}>
													{mode.toUpperCase()}
												</Radio>
											))}
									</Space>
								</Radio.Group>
								<div style={{ marginTop: 12 }}>
									<Form.Item
										label={t('field_jira_custom_field_value')}
										validateStatus={customFieldErrors[index] ? 'error' : ''}
										help={customFieldErrors[index]}
									>
										{row.mode === 'select' ? (
											<Select
												mode={row.schemaType === 'array' ? 'multiple' : undefined}
												value={row.value}
												onChange={(value): void =>
													updateCustomFieldRow(index, { value })
												}
												options={(row.allowedValues || []).map((option) => ({
													label: option,
													value: option,
												}))}
												placeholder={t('placeholder_jira_custom_field_value')}
												data-testid={`jira-custom-field-value-${index}`}
											/>
										) : row.mode === 'json' ? (
											<TextArea
												rows={3}
												value={Array.isArray(row.value) ? JSON.stringify(row.value) : row.value}
												onChange={(event): void =>
													updateCustomFieldRow(index, { value: event.target.value })
												}
												placeholder={t('placeholder_jira_custom_field_value')}
												data-testid={`jira-custom-field-value-${index}`}
											/>
										) : (
											<Input
												value={Array.isArray(row.value) ? row.value.join(', ') : row.value}
												onChange={(event): void =>
													updateCustomFieldRow(index, { value: event.target.value })
												}
												placeholder={t('placeholder_jira_custom_field_value')}
												data-testid={`jira-custom-field-value-${index}`}
											/>
										)}
									</Form.Item>
								</div>
								{renderSchema(row)}
							</div>
						),
					}))}
				/>
				<div style={{ margin: '16px 0 12px', fontWeight: 600 }}>Optional fields</div>
				<Collapse
					accordion={false}
					items={optionalRows.map(({ row, index }) => ({
						key: row.fieldId || `${row.label}-${index}`,
						label: row.label,
						children: (
							<div>
								<div style={{ marginBottom: 8 }}>Field ID: {row.fieldId}</div>
								<Radio.Group
									value={row.mode}
									onChange={(event): void => {
										updateCustomFieldRow(index, {
											mode: event.target.value as FieldMode,
											value: event.target.value === 'none' ? '' : row.value,
										});
									}}
								>
									<Space size="middle">
										{getModeOptions(row).map((mode) => (
											<Radio key={mode} value={mode}>
												{mode.toUpperCase()}
											</Radio>
										))}
									</Space>
								</Radio.Group>
								{row.mode !== 'none' && (
									<div style={{ marginTop: 12 }}>
										<Form.Item
											label={t('field_jira_custom_field_value')}
											validateStatus={customFieldErrors[index] ? 'error' : ''}
											help={customFieldErrors[index]}
										>
											{row.mode === 'select' ? (
												<Select
													mode={row.schemaType === 'array' ? 'multiple' : undefined}
													value={row.value}
													onChange={(value): void =>
														updateCustomFieldRow(index, { value })
													}
													options={(row.allowedValues || []).map((option) => ({
														label: option,
														value: option,
													}))}
													placeholder={t('placeholder_jira_custom_field_value')}
													data-testid={`jira-custom-field-value-${index}`}
												/>
											) : row.mode === 'json' ? (
												<TextArea
													rows={3}
													value={Array.isArray(row.value) ? JSON.stringify(row.value) : row.value}
													onChange={(event): void =>
														updateCustomFieldRow(index, { value: event.target.value })
													}
													placeholder={t('placeholder_jira_custom_field_value')}
													data-testid={`jira-custom-field-value-${index}`}
												/>
											) : (
												<Input
													value={Array.isArray(row.value) ? row.value.join(', ') : row.value}
													onChange={(event): void =>
														updateCustomFieldRow(index, { value: event.target.value })
													}
													placeholder={t('placeholder_jira_custom_field_value')}
													data-testid={`jira-custom-field-value-${index}`}
												/>
											)}
										</Form.Item>
									</div>
								)}
								{renderSchema(row)}
							</div>
						),
					}))}
				/>
				<div style={{ marginTop: 16, fontWeight: 600 }}>Additional fields</div>
				{manualRows.map(({ row, index }) => (
					<div key={`${row.label}-${index}`} className="jira-custom-field-row">
						<div className="jira-custom-field-row-label">{row.label}</div>
						<Form.Item
							label={t('field_jira_custom_field_id')}
							validateStatus={customFieldErrors[index] ? 'error' : ''}
							help={customFieldErrors[index]}
						>
							<Input
								value={row.fieldId}
								onChange={(event): void =>
									updateCustomFieldRow(index, { fieldId: event.target.value })
								}
								placeholder="customfield_12345"
								data-testid={`jira-custom-field-id-${index}`}
							/>
						</Form.Item>
						<Form.Item label={t('field_jira_custom_field_value')}>
							{row.mode === 'json' ? (
								<TextArea
									rows={2}
									value={Array.isArray(row.value) ? JSON.stringify(row.value) : row.value}
									onChange={(event): void =>
										updateCustomFieldRow(index, { value: event.target.value })
									}
									placeholder={t('placeholder_jira_custom_field_value')}
									data-testid={`jira-custom-field-value-${index}`}
								/>
							) : (
								<TextArea
									rows={2}
									value={Array.isArray(row.value) ? row.value.join(', ') : row.value}
									onChange={(event): void =>
										updateCustomFieldRow(index, { value: event.target.value })
									}
									placeholder={t('placeholder_jira_custom_field_value')}
									data-testid={`jira-custom-field-value-${index}`}
								/>
							)}
						</Form.Item>
						<Form.Item label={t('field_jira_custom_field_type')}>
							<Select
								value={row.mode}
								onChange={(value): void =>
									updateCustomFieldRow(index, { mode: value as FieldMode })
								}
								data-testid={`jira-custom-field-type-${index}`}
							>
								<Select.Option value="text">{t('jira_custom_field_text')}</Select.Option>
								<Select.Option value="json">{t('jira_custom_field_json')}</Select.Option>
							</Select>
						</Form.Item>
					</div>
				))}
				<div>
					<div>{t('jira_custom_field_add_hint')}</div>
					<Button type="dashed" onClick={addCustomFieldRow}>
						{t('jira_custom_field_add')}
					</Button>
				</div>
			</Form.Item>
		</>
	);
}

interface JiraSettingsProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<JiraChannel>>>;
	selectedConfig?: Partial<JiraChannel>;
}

export default JiraSettings;
