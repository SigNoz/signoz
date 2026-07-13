import { useEffect, useState } from 'react';
import { Plus, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import type { DashboardLinkDTO } from 'api/generated/services/sigNoz.schemas';

import type { UrlParam, VariableItem } from './types';
import {
	getUrlParams,
	insertVariableAtCursor,
	isValidContextLinkUrl,
	updateUrlWithParams,
} from './utils';
import VariablesPopover from './VariablesPopover';

import styles from './ContextLinksSection.module.scss';

interface ContextLinkDialogProps {
	open: boolean;
	/** The link being edited, or null when adding a new one. */
	initialLink: DashboardLinkDTO | null;
	variables: VariableItem[];
	onOpenChange: (open: boolean) => void;
	onSave: (link: DashboardLinkDTO) => void;
}

const URL_ERROR = 'URL must start with http(s)://, /, or {{variable}}/';

const cursorOf = (e: { target: EventTarget }): number =>
	(e.target as HTMLInputElement).selectionStart ?? 0;

/**
 * Modal editor for a single context link (V1 parity): label + URL with `{{variable}}`
 * autocomplete + validation, a key/value URL-parameters editor, and an "open in new tab"
 * toggle. The URL is the source of truth; parameter rows are its query string projected
 * out (blank-key rows live only in local state until they get a key). Save is gated on a
 * non-empty, well-formed URL. `renderVariables` is set so consumers interpolate the URL.
 */
function ContextLinkDialog({
	open,
	initialLink,
	variables,
	onOpenChange,
	onSave,
}: ContextLinkDialogProps): JSX.Element {
	const [name, setName] = useState('');
	const [url, setUrlState] = useState('');
	const [targetBlank, setTargetBlank] = useState(true);
	const [params, setParams] = useState<UrlParam[]>([]);

	// Seed the draft each time the dialog opens for a (possibly different) link.
	useEffect(() => {
		if (open) {
			setName(initialLink?.name ?? '');
			setUrlState(initialLink?.url ?? '');
			setTargetBlank(initialLink?.targetBlank ?? true);
			setParams(getUrlParams(initialLink?.url ?? ''));
		}
	}, [open, initialLink]);

	const setUrl = (next: string): void => {
		setUrlState(next);
		setParams(getUrlParams(next));
	};

	const applyParams = (next: UrlParam[]): void => {
		setParams(next);
		setUrlState(updateUrlWithParams(url, next));
	};

	const patchParam = (index: number, patch: Partial<UrlParam>): void =>
		applyParams(params.map((p, i) => (i === index ? { ...p, ...patch } : p)));

	const addParam = (): void => {
		const last = params[params.length - 1];
		if (!last || last.key.trim() || last.value.trim()) {
			setParams([...params, { key: '', value: '' }]);
		}
	};

	const urlInvalid = !isValidContextLinkUrl(url);
	const canSave = !!url.trim() && !urlInvalid;

	const handleSave = (): void => {
		if (canSave) {
			onSave({ name, url, targetBlank, renderVariables: true });
		}
	};

	return (
		<DialogWrapper
			open={open}
			onOpenChange={onOpenChange}
			title={initialLink ? 'Edit context link' : 'Add a context link'}
			width="wide"
			testId="context-link-dialog"
			footer={
				<>
					<Button
						type="button"
						variant="outlined"
						color="secondary"
						data-testid="context-link-cancel"
						onClick={(): void => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="solid"
						color="primary"
						disabled={!canSave}
						data-testid="context-link-save"
						onClick={handleSave}
					>
						Save
					</Button>
				</>
			}
		>
			<div className={styles.form}>
				<div className={styles.formField}>
					<Typography.Text className={styles.formLabel}>Label</Typography.Text>
					<Input
						data-testid="context-link-label"
						placeholder="View trace details: {{_traceId}}"
						value={name}
						onChange={(e): void => setName(e.target.value)}
					/>
				</div>

				<div className={styles.formField}>
					<Typography.Text className={styles.formLabel}>
						URL <span className={styles.required}>*</span>
					</Typography.Text>
					<VariablesPopover
						variables={variables}
						onVariableSelect={(token, cursor): void =>
							setUrl(insertVariableAtCursor(url, token, cursor))
						}
					>
						{({ setIsOpen, setCursorPosition }): JSX.Element => (
							<Input
								data-testid="context-link-url"
								placeholder="https://… or /path?var={{variable}}"
								value={url}
								status={urlInvalid ? 'error' : undefined}
								autoComplete="off"
								onChange={(e): void => {
									setCursorPosition(e.target.selectionStart ?? 0);
									setUrl(e.target.value);
								}}
								onFocus={(): void => setIsOpen(true)}
								onClick={(e): void => setCursorPosition(cursorOf(e))}
								onKeyUp={(e): void => setCursorPosition(cursorOf(e))}
							/>
						)}
					</VariablesPopover>
					{urlInvalid && (
						<Typography.Text
							className={styles.urlError}
							data-testid="context-link-url-error"
						>
							{URL_ERROR}
						</Typography.Text>
					)}
				</div>

				{params.length > 0 && (
					<div className={styles.formField}>
						<Typography.Text className={styles.formLabel}>
							URL parameters
						</Typography.Text>
						<div className={styles.params}>
							{params.map((param, index) => (
								<div
									className={styles.paramRow}
									// Parameter rows have no stable id; index is the row identity here.
									// eslint-disable-next-line react/no-array-index-key
									key={index}
								>
									<Input
										data-testid={`context-link-param-key-${index}`}
										placeholder="Key"
										value={param.key}
										onChange={(e): void => patchParam(index, { key: e.target.value })}
									/>
									<VariablesPopover
										variables={variables}
										onVariableSelect={(token, cursor): void =>
											patchParam(index, {
												value: insertVariableAtCursor(param.value, token, cursor),
											})
										}
									>
										{({ setIsOpen, setCursorPosition }): JSX.Element => (
											<Input
												data-testid={`context-link-param-value-${index}`}
												placeholder="Value"
												value={param.value}
												onChange={(e): void => {
													setCursorPosition(e.target.selectionStart ?? 0);
													patchParam(index, { value: e.target.value });
												}}
												onFocus={(): void => setIsOpen(true)}
												onClick={(e): void => setCursorPosition(cursorOf(e))}
												onKeyUp={(e): void => setCursorPosition(cursorOf(e))}
											/>
										)}
									</VariablesPopover>
									<Button
										type="button"
										variant="ghost"
										color="destructive"
										size="icon"
										aria-label={`Remove parameter ${index + 1}`}
										data-testid={`context-link-param-remove-${index}`}
										onClick={(): void =>
											applyParams(params.filter((_, i) => i !== index))
										}
									>
										<Trash2 size={14} />
									</Button>
								</div>
							))}
						</div>
					</div>
				)}

				<Button
					type="button"
					variant="dashed"
					color="secondary"
					prefix={<Plus size={12} />}
					data-testid="context-link-add-param"
					onClick={addParam}
				>
					Add URL parameter
				</Button>

				<div className={styles.newTab}>
					<Switch
						testId="context-link-newtab"
						value={targetBlank}
						onChange={setTargetBlank}
					/>
					<Typography.Text className={styles.newTabLabel}>
						Open in new tab
					</Typography.Text>
				</div>
			</div>
		</DialogWrapper>
	);
}

export default ContextLinkDialog;
