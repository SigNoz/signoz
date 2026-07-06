import {
	ChangeEvent,
	Dispatch,
	SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Collapse, Form, Input, Select } from 'antd';
import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
import {
	fetchJiraProjectIssueTypes,
	fetchJiraProjects,
} from 'api/channels/getJiraProjects';
import jiraMetadata from 'api/channels/getJiraMetadata';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import {
	JiraAllowedValue,
	JiraFieldMetadata,
} from 'types/api/channels/jiraMetadata';
import { JiraIssueType, JiraProject } from 'types/api/channels/jiraProjects';

import { JiraChannel } from '../../CreateAlertChannels/config';

const { TextArea } = Input;

type FieldMode = 'none' | 'text' | 'select' | 'json';

type CustomFieldRow = {
	label: string;
	fieldId: string;
	value: string | string[];
	mode: FieldMode;
	allowedValues?: JiraAllowedValue[];
	schemaType?: string;
	schemaItems?: string;
	schemaSystem?: string;
	schemaCustom?: string;
	schemaCustomId?: number;
	required?: boolean;
	touched?: boolean;
};

function JiraSettings({ setSelectedConfig }: JiraSettingsProps): JSX.Element {
	const { t } = useTranslation('channels');
	const form = Form.useFormInstance();
	const apiUrl = Form.useWatch('api_url', form) as string | undefined;
	const username = Form.useWatch('username', form) as string | undefined;
	const password = Form.useWatch('password', form) as string | undefined;
	const project = Form.useWatch('project', form) as string | undefined;
	const issueType = Form.useWatch('issue_type', form) as string | undefined;
	const currentCustomFieldsRef = useRef<Record<string, unknown>>(
		(form.getFieldValue('custom_fields') as Record<string, unknown>) ?? {},
	);
	const customFieldsSeededRef = useRef(false);

	const standardFieldIds = useMemo(
		() =>
			new Set([
				'summary',
				'description',
				'project',
				'issuetype',
				'priority',
				'labels',
			]),
		[],
	);

	const [customFieldRows, setCustomFieldRows] = useState<CustomFieldRow[]>([]);
	const [customFieldErrors, setCustomFieldErrors] = useState<
		Record<number, string>
	>({});
	const [metadataError, setMetadataError] = useState('');
	const [projects, setProjects] = useState<JiraProject[]>([]);
	const [issueTypes, setIssueTypes] = useState<JiraIssueType[]>([]);
	const [projectsLoading, setProjectsLoading] = useState(false);
	const [issueTypesLoading, setIssueTypesLoading] = useState(false);
	const [projectsError, setProjectsError] = useState('');
	const [issueTypesError, setIssueTypesError] = useState('');

	const handleInputChange =
		(field: string) =>
		(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
			setSelectedConfig((value) => ({
				...value,
				[field]: event.target.value,
			}));
		};

	const extractCustomFieldValue = (
		value: unknown,
	): { value: string | string[]; mode: FieldMode } => {
		if (Array.isArray(value)) {
			const allStrings = value.every((item) => typeof item === 'string');
			if (allStrings) {
				return { value: value as string[], mode: 'text' };
			}
			return { value: JSON.stringify(value), mode: 'json' };
		}
		if (value && typeof value === 'object') {
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

	const isSelectField = (field: JiraFieldMetadata): boolean =>
		!!field.allowed_values && field.allowed_values.length > 0;

	const isTextField = (field: JiraFieldMetadata): boolean => {
		if (field.schema_type === 'string' || field.schema_type === 'text') {
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

	// coerceRowValue finalises the value stored on a CustomFieldRow after mode and extraction have been resolved.
	const coerceRowValue = (
		mode: FieldMode,
		extracted: { value: string | string[]; mode: FieldMode },
		isArrayField: boolean,
	): string | string[] => {
		if (mode === 'json' && extracted.mode !== 'json') {
			return extracted.value ? JSON.stringify(extracted.value) : '';
		}
		if (
			extracted.mode !== 'json' &&
			isArrayField &&
			!Array.isArray(extracted.value)
		) {
			return extracted.value ? [extracted.value] : [];
		}
		return extracted.value;
	};

	// shapeSelectValue coerces extracted plain value(s) into the shape the SELECT widget expects.
	const shapeSelectValue = (
		plain: string | string[],
		isArrayField: boolean,
	): string | string[] => {
		if (isArrayField) {
			return Array.isArray(plain) ? plain : [plain].filter((item) => item !== '');
		}
		return Array.isArray(plain) ? (plain[0] ?? '') : plain;
	};

	const jsonToSelectValue = (parsed: unknown): string | string[] => {
		const toStr = (value: unknown): string =>
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
				? String(value)
				: '';
		const extract = (item: unknown): string => {
			if (item && typeof item === 'object') {
				const obj = item as Record<string, unknown>;
				return toStr(obj.value ?? obj.accountId ?? obj.key ?? obj.id ?? obj.name);
			}
			return toStr(item);
		};
		if (Array.isArray(parsed)) {
			return parsed.map(extract);
		}
		return extract(parsed);
	};

	const resolveSelectFieldValue = (
		existingValue: unknown,
		isArrayField: boolean,
	): string | string[] =>
		shapeSelectValue(jsonToSelectValue(existingValue), isArrayField);

	const resolveMetadataRows = (
		fields: JiraFieldMetadata[],
		customFields?: Record<string, unknown>,
	): CustomFieldRow[] =>
		fields
			.filter((field) => !standardFieldIds.has(field.id))
			.map((field) => {
				const existingValue = customFields ? customFields[field.id] : undefined;
				const isArrayField = field.schema_type === 'array';
				const meta = {
					label: field.name,
					fieldId: field.id,
					allowedValues: field.allowed_values,
					schemaType: field.schema_type,
					schemaItems: field.schema_items,
					schemaSystem: field.schema_system,
					schemaCustom: field.schema_custom,
					schemaCustomId: field.schema_custom_id,
					required: field.required,
				};

				if (isSelectField(field)) {
					const value = resolveSelectFieldValue(existingValue, isArrayField);
					return {
						...meta,
						value,
						mode: hasFieldValue(value) || field.required ? 'select' : 'none',
					};
				}

				const extracted = extractCustomFieldValue(existingValue);
				const hasValue = hasFieldValue(extracted.value);
				const defaultMode = inferDefaultMode(field);
				const mode = hasValue
					? extracted.mode === 'json'
						? 'json'
						: defaultMode
					: field.required
						? defaultMode
						: 'none';

				const value = coerceRowValue(mode, extracted, isArrayField);
				return { ...meta, value, mode };
			});

	const serializeRowValue = (row: CustomFieldRow): unknown => {
		const isArrayField = row.schemaType === 'array';

		const toTrimmedValues = (): string[] => {
			const values = Array.isArray(row.value)
				? row.value
				: String(row.value).split(',');
			return values
				.map((value) => String(value).trim())
				.filter((value) => value !== '');
		};

		if (
			row.mode === 'select' &&
			row.allowedValues &&
			row.allowedValues.length > 0
		) {
			const wrap = (value: string): Record<string, string> => ({ value });
			if (isArrayField) {
				return toTrimmedValues().map(wrap);
			}
			const single = Array.isArray(row.value) ? (row.value[0] ?? '') : row.value;
			return wrap(single);
		}

		if (isArrayField) {
			return toTrimmedValues();
		}

		return Array.isArray(row.value) ? row.value.join(',') : row.value;
	};

	const buildCustomFields = (
		rows: CustomFieldRow[],
	): Record<string, unknown> => {
		const nextErrors: Record<number, string> = {};
		const nextFields: Record<string, unknown> = {};

		rows.forEach((row, index) => {
			if (row.mode === 'none') {
				return;
			}
			const valueString = Array.isArray(row.value)
				? row.value.join(',')
				: row.value;
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
				const raw = Array.isArray(row.value)
					? JSON.stringify(row.value)
					: String(row.value);
				try {
					nextFields[row.fieldId.trim()] = JSON.parse(raw);
				} catch (error) {
					if (row.touched) {
						nextErrors[index] = t('jira_custom_field_json_invalid');
					}
					return;
				}
				return;
			}

			nextFields[row.fieldId.trim()] = serializeRowValue(row);
		});

		setCustomFieldErrors(nextErrors);
		return nextFields;
	};

	useEffect(() => {
		if (!customFieldsSeededRef.current) {
			return;
		}
		const customFields = buildCustomFields(customFieldRows);
		currentCustomFieldsRef.current = customFields;
		setSelectedConfig((value) => ({
			...value,
			custom_fields: customFields,
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
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

	const jsonRowToValue = (
		row: CustomFieldRow,
		nextMode: FieldMode,
	): string | string[] => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(String(row.value));
		} catch {
			parsed = row.value;
		}
		const extracted = jsonToSelectValue(parsed);
		if (nextMode !== 'select') {
			return extracted;
		}
		return shapeSelectValue(extracted, row.schemaType === 'array');
	};

	const handleModeChange = (
		index: number,
		row: CustomFieldRow,
		nextMode: FieldMode,
	): void => {
		if (nextMode === row.mode) {
			return;
		}
		if (nextMode === 'none') {
			updateCustomFieldRow(index, { mode: 'none', value: '' });
			return;
		}
		if (nextMode === 'json') {
			updateCustomFieldRow(index, {
				mode: 'json',
				value: JSON.stringify(serializeRowValue(row), null, 2),
			});
			return;
		}
		if (row.mode === 'json') {
			updateCustomFieldRow(index, {
				mode: nextMode,
				value: jsonRowToValue(row, nextMode),
			});
			return;
		}

		if (nextMode === 'select') {
			// Normalise any plain text value into the shape the select widget expects.
			if (row.schemaType === 'array') {
				const values = Array.isArray(row.value)
					? row.value
					: String(row.value)
							.split(',')
							.map((item) => item.trim())
							.filter((item) => item !== '');
				updateCustomFieldRow(index, { mode: nextMode, value: values });
			} else {
				const single = Array.isArray(row.value) ? (row.value[0] ?? '') : row.value;
				updateCustomFieldRow(index, { mode: nextMode, value: single });
			}
			return;
		}
		updateCustomFieldRow(index, { mode: nextMode });
	};

	const loadMetadata = async (): Promise<void> => {
		if (!apiUrl || !username || !password) {
			setMetadataError(t('jira_metadata_missing_auth'));
			return;
		}
		if (!project || !issueType) {
			setMetadataError(t('jira_metadata_missing_project'));
			return;
		}

		setMetadataError('');
		try {
			const response = await jiraMetadata({
				api_url: apiUrl,
				api_type: 'auto',
				username,
				password,
				project,
				issue_type: issueType,
			});
			const fields = response.data.data?.fields || [];
			if (!customFieldsSeededRef.current) {
				const raw =
					(form.getFieldValue('custom_fields') as Record<string, unknown>) ?? {};
				// Strip empty-string values that were saved by older code so they
				// don't seed fields as if they had actual values.
				const savedCustomFields = Object.fromEntries(
					Object.entries(raw).filter(
						([, v]) => v !== '' && v !== null && v !== undefined,
					),
				);
				if (Object.keys(savedCustomFields).length > 0) {
					currentCustomFieldsRef.current = savedCustomFields;
				}
				customFieldsSeededRef.current = true;
			}
			setCustomFieldRows(
				resolveMetadataRows(fields, currentCustomFieldsRef.current),
			);
		} catch (error) {
			setMetadataError(t('jira_metadata_failed'));
		}
	};

	const loadProjects = async (): Promise<void> => {
		if (!apiUrl || !username || !password) {
			setProjectsError(t('jira_metadata_missing_auth'));
			return;
		}

		setProjectsLoading(true);
		setProjectsError('');
		try {
			const projectsResponse = await fetchJiraProjects({
				api_url: apiUrl,
				username,
				password,
			});
			const loadedProjects = projectsResponse.data.projects || [];
			setProjects(loadedProjects);
		} catch (error) {
			setProjectsError(t('jira_projects_failed'));
		} finally {
			setProjectsLoading(false);
		}
	};

	// Reload projects whenever the credentials change.
	useEffect(() => {
		if (!apiUrl || !username || !password) {
			return undefined;
		}
		const handle = setTimeout((): void => {
			void loadProjects();
		}, 500);
		return (): void => clearTimeout(handle);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [apiUrl, username, password]);

	const loadIssueTypes = async (projectKey: string): Promise<void> => {
		if (!apiUrl || !username || !password) {
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
				api_url: apiUrl,
				username,
				password,
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
		if (!project) {
			return;
		}
		void loadIssueTypes(project);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [project]);

	useEffect(() => {
		if (!project || !issueType) {
			return;
		}
		void loadMetadata();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [project, issueType]);

	const requiredRows = useMemo(
		() =>
			customFieldRows.flatMap((row, index) =>
				row.required ? [{ row, index }] : [],
			),
		[customFieldRows],
	);

	const optionalRows = useMemo(
		() =>
			customFieldRows.flatMap((row, index) =>
				!row.required ? [{ row, index }] : [],
			),
		[customFieldRows],
	);

	const getModeOptions = (row: CustomFieldRow): FieldMode[] => {
		const modes: FieldMode[] = [];
		if (!row.required) {
			modes.push('none');
		}
		const rowAsField = {
			allowed_values: row.allowedValues,
			schema_type: row.schemaType,
			schema_items: row.schemaItems,
		} as JiraFieldMetadata;
		if (isSelectField(rowAsField)) {
			modes.push('select');
		} else if (isTextField(rowAsField)) {
			modes.push('text');
		}
		modes.push('json');
		return modes;
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
			schema.allowedValues = row.allowedValues.map((option) => option.label);
		}
		return (
			<Form.Item
				label={t('jira_custom_field_schema_heading')}
				tooltip={{
					title: (
						<Trans
							i18nKey="jira_custom_field_schema_tooltip"
							ns="channels"
							components={{
								1: (
									<a
										href="https://support.atlassian.com/cloud-automation/docs/advanced-field-editing-using-json/"
										target="_blank"
										rel="noopener noreferrer"
									>
										Jira documentation
									</a>
								),
							}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400, whiteSpace: 'pre-line' },
				}}
				style={{ marginTop: 12, marginBottom: 0 }}
			>
				<pre
					style={{
						margin: 0,
						background: 'var(--l1-background)',
						border: '1px solid var(--l1-border)',
						color: 'var(--l1-foreground)',
						padding: 8,
						borderRadius: 4,
					}}
				>
					{JSON.stringify(schema, null, 2)}
				</pre>
			</Form.Item>
		);
	};

	const renderValueEditor = (
		row: CustomFieldRow,
		index: number,
	): JSX.Element => {
		if (row.mode === 'select') {
			return (
				<Select
					mode={row.schemaType === 'array' ? 'multiple' : undefined}
					value={row.value}
					onChange={(value): void => updateCustomFieldRow(index, { value })}
					options={(row.allowedValues || []).map((option) => ({
						label: option.label,
						value: option.value,
					}))}
					placeholder={t('placeholder_jira_custom_field_value')}
					data-testid={`jira-custom-field-value-${index}`}
				/>
			);
		}
		if (row.mode === 'json') {
			return (
				<TextArea
					rows={3}
					value={Array.isArray(row.value) ? JSON.stringify(row.value) : row.value}
					onChange={(event): void =>
						updateCustomFieldRow(index, { value: event.target.value })
					}
					placeholder={t('placeholder_jira_custom_field_value')}
					data-testid={`jira-custom-field-value-${index}`}
				/>
			);
		}
		return (
			<Input
				value={Array.isArray(row.value) ? row.value.join(', ') : row.value}
				onChange={(event): void =>
					updateCustomFieldRow(index, { value: event.target.value })
				}
				placeholder={t('placeholder_jira_custom_field_value')}
				data-testid={`jira-custom-field-value-${index}`}
			/>
		);
	};

	const renderCustomFieldRow = (
		row: CustomFieldRow,
		index: number,
	): JSX.Element => (
		<div>
			<div style={{ marginBottom: 8 }}>
				{t('jira_custom_field_id_label')}: {row.fieldId}
			</div>
			<ToggleGroupSimple
				type="single"
				size="sm"
				value={row.mode}
				onChange={(value: string): void => {
					if (value) {
						handleModeChange(index, row, value as FieldMode);
					}
				}}
				items={getModeOptions(row).map((mode) => ({
					value: mode,
					label: mode.toUpperCase(),
				}))}
				testId={`jira-custom-field-mode-${index}`}
			/>
			{row.mode !== 'none' && (
				<div style={{ marginTop: 12 }}>
					<Form.Item
						label={t('field_jira_custom_field_value')}
						validateStatus={customFieldErrors[index] ? 'error' : ''}
						help={customFieldErrors[index]}
					>
						{renderValueEditor(row, index)}
					</Form.Item>
				</div>
			)}
			{row.mode === 'json' && renderSchema(row)}
		</div>
	);

	return (
		<>
			<Form.Item
				name="api_url"
				label={t('field_jira_api_url')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jira_api_url')}
							variables={{}}
						/>
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
				label={t('field_jira_username')}
				help={t('help_jira_username')}
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
				label={t('field_jira_password')}
				help={t('help_jira_password')}
				required
			>
				<Input
					type="password"
					onChange={handleInputChange('password')}
					placeholder="API token or password"
					data-testid="jira-password-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="project"
				label={t('field_jira_project')}
				required
				validateStatus={projectsError ? 'error' : ''}
				help={projectsError || undefined}
			>
				<Select
					showSearch
					optionFilterProp="label"
					loading={projectsLoading}
					onChange={(value): void => {
						setSelectedConfig((current) => ({
							...current,
							project: value,
							issue_type: undefined,
						}));
						form.setFieldValue('issue_type', undefined);
						setIssueTypes([]);
						setIssueTypesError('');
						setCustomFieldRows([]);
						setMetadataError('');
					}}
					options={projects.map((proj) => ({
						label: `${proj.key} - ${proj.name}`,
						value: proj.key,
					}))}
					placeholder={t('jira_project_placeholder')}
				/>
			</Form.Item>

			<Form.Item
				name="issue_type"
				label={t('field_jira_issue_type')}
				required
				validateStatus={issueTypesError ? 'error' : ''}
				help={issueTypesError || undefined}
			>
				<Select
					showSearch
					optionFilterProp="label"
					loading={issueTypesLoading}
					onChange={(value): void => {
						setSelectedConfig((current) => ({
							...current,
							issue_type: value,
						}));
					}}
					options={issueTypes.map((type) => ({
						label: type.name,
						value: type.name,
					}))}
					placeholder={t('jira_issue_type_placeholder')}
				/>
			</Form.Item>

			{metadataError && <div>{metadataError}</div>}

			<Form.Item
				name="summary"
				help={t('help_jira_summary')}
				label={t('field_jira_summary')}
				required
			>
				<Input
					onChange={handleInputChange('summary')}
					data-testid="jira-summary-textbox"
				/>
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
				<Input
					onChange={handleInputChange('priority')}
					data-testid="jira-priority-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="labels"
				help={t('help_jira_labels')}
				label={t('field_jira_labels')}
			>
				<Input
					onChange={handleInputChange('labels')}
					data-testid="jira-labels-textbox"
				/>
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
				help={t('help_jira_reopen_transition')}
				label={t('field_jira_reopen_transition')}
			>
				<Input
					onChange={handleInputChange('reopen_transition')}
					data-testid="jira-reopen-transition-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="reopen_duration"
				help={t('help_jira_reopen_duration')}
				label={t('field_jira_reopen_duration')}
			>
				<Input
					onChange={handleInputChange('reopen_duration')}
					placeholder="7d"
					data-testid="jira-reopen-duration-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="wont_fix_resolution"
				help={t('help_jira_wont_fix_resolution')}
				label={t('field_jira_wont_fix_resolution')}
			>
				<Input
					onChange={handleInputChange('wont_fix_resolution')}
					data-testid="jira-wont-fix-resolution-textbox"
				/>
			</Form.Item>

			<Form.Item>
				{(requiredRows.length > 0 || optionalRows.length > 0) && (
					<div style={{ marginBottom: 12, marginTop: 12 }}>
						{t('jira_custom_fields_heading')}
					</div>
				)}
				{requiredRows.length > 0 && (
					<Collapse
						accordion={false}
						bordered={false}
						size="small"
						style={{ background: 'transparent' }}
						items={requiredRows.map(({ row, index }) => ({
							key: row.fieldId || `${row.label}-${index}`,
							label: row.label,
							style: { background: 'transparent', border: 'none' },
							children: renderCustomFieldRow(row, index),
						}))}
					/>
				)}
				{optionalRows.length > 0 && (
					<Collapse
						accordion={false}
						bordered={false}
						size="small"
						style={{
							background: 'transparent',
							marginTop: requiredRows.length > 0 ? 8 : 0,
						}}
						items={optionalRows.map(({ row, index }) => ({
							key: row.fieldId || `${row.label}-${index}`,
							label: row.label,
							style: { background: 'transparent', border: 'none' },
							children: renderCustomFieldRow(row, index),
						}))}
					/>
				)}
			</Form.Item>
		</>
	);
}

interface JiraSettingsProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<JiraChannel>>>;
}

export default JiraSettings;
