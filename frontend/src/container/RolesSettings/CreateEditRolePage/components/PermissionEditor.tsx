import { useCallback, useRef, useState } from 'react';
import { SolidAlertTriangle } from '@signozhq/icons';
import { Button, ButtonGroup } from '@signozhq/ui/button';
import { ConfirmDialog } from '@signozhq/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Typography } from '@signozhq/ui/typography';
import { Skeleton } from 'antd';
import type { AuthZResource, AuthZVerb } from 'lib/authz/hooks/useAuthZ/types';

import { PermissionScope, ResourcePermissions } from '../../types';
import type { EditorMode, JsonEditorRef } from './JsonEditor.types';
import JsonEditor from './JsonEditor';
import ResourceCard from './ResourceCard';

import styles from './PermissionEditor.module.scss';

interface PermissionEditorProps {
	resources: ResourcePermissions[];
	mode: EditorMode;
	onModeChange: (mode: EditorMode) => void;
	onResourceChange: (resources: ResourcePermissions[]) => void;
	onJsonValidityChange?: (hasError: boolean) => void;
	isLoading?: boolean;
	validationErrors?: Set<string>;
}

function PermissionEditor({
	resources,
	mode,
	onModeChange,
	onResourceChange,
	onJsonValidityChange,
	isLoading = false,
	validationErrors,
}: PermissionEditorProps): JSX.Element {
	const jsonEditorRef = useRef<JsonEditorRef>(null);

	const handleJsonValidityChange = useCallback(
		(hasError: boolean): void => {
			onJsonValidityChange?.(mode === 'json' && hasError);
		},
		[mode, onJsonValidityChange],
	);
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
	const [expandedResources, setExpandedResources] = useState<Set<string>>(
		new Set(),
	);

	const handleExpandAll = useCallback((): void => {
		setExpandedResources(new Set(resources.map((r) => r.resourceId)));
	}, [resources]);

	const handleCollapseAll = useCallback((): void => {
		setExpandedResources(new Set());
	}, []);

	const handleExpandChange = useCallback(
		(resourceId: string) =>
			(expanded: boolean): void => {
				setExpandedResources((prev) => {
					const next = new Set(prev);
					if (expanded) {
						next.add(resourceId);
					} else {
						next.delete(resourceId);
					}
					return next;
				});
			},
		[],
	);

	const handleActionChange = useCallback(
		(
			resourceId: AuthZResource,
			action: AuthZVerb,
			scope: PermissionScope,
			selectedIds: string[],
		): void => {
			const updatedResources = resources.map((r) => {
				if (r.resourceId !== resourceId) {
					return r;
				}
				return {
					...r,
					actions: {
						...r.actions,
						[action]: {
							scope: scope,
							selectedIds,
						},
					},
				};
			});
			onResourceChange(updatedResources);
		},
		[resources, onResourceChange],
	);

	const handleJsonChange = useCallback(
		(updatedResources: ResourcePermissions[]): void => {
			onResourceChange(updatedResources);
		},
		[onResourceChange],
	);

	const handleModeChange = useCallback(
		(value: string): void => {
			const newMode = value as EditorMode;

			if (
				newMode === 'interactive' &&
				mode === 'json' &&
				jsonEditorRef.current?.hasParseError()
			) {
				setShowDiscardConfirm(true);
				return;
			}

			if (newMode === 'interactive') {
				onJsonValidityChange?.(false);
			}

			onModeChange(newMode);
		},
		[mode, onModeChange, onJsonValidityChange],
	);

	const handleDiscardConfirm = useCallback(async (): Promise<boolean> => {
		onJsonValidityChange?.(false);
		onModeChange('interactive');
		setShowDiscardConfirm(false);
		return true;
	}, [onModeChange, onJsonValidityChange]);

	const handleDiscardCancel = useCallback((): void => {
		setShowDiscardConfirm(false);
	}, []);

	if (isLoading) {
		return (
			<div className={styles.permissionEditor}>
				<Skeleton active paragraph={{ rows: 6 }} />
			</div>
		);
	}

	return (
		<div className={styles.permissionEditor} data-testid="permission-editor">
			<div className={styles.permissionEditorHeader}>
				<Typography
					as="span"
					size="small"
					weight="medium"
					color="muted"
					className={styles.permissionEditorTitle}
				>
					Transaction Groups
				</Typography>
				<hr className={styles.permissionEditorDivider} />
				<RadioGroup
					className={styles.permissionEditorModeToggle}
					value={mode}
					onChange={handleModeChange}
					testId="permission-editor-mode"
				>
					<RadioGroupItem
						value="interactive"
						containerClassName={styles.permissionEditorModeItem}
						className={styles.permissionEditorModeInput}
						testId="permission-editor-mode-interactive"
					>
						Interactive
					</RadioGroupItem>
					<RadioGroupItem
						value="json"
						containerClassName={styles.permissionEditorModeItem}
						className={styles.permissionEditorModeInput}
						testId="permission-editor-mode-json"
					>
						JSON
					</RadioGroupItem>
				</RadioGroup>
			</div>

			<div className={styles.permissionEditorContent}>
				{mode === 'interactive' ? (
					<>
						<div className={styles.permissionEditorCollapseAction}>
							<ButtonGroup
								variant="outlined"
								color="secondary"
								size="sm"
								testId="toggle-all-group"
							>
								<Button onClick={handleExpandAll} data-testid="expand-all-button">
									Expand all
								</Button>
								<Button onClick={handleCollapseAll} data-testid="collapse-all-button">
									Collapse all
								</Button>
							</ButtonGroup>
						</div>
						<div className={styles.permissionEditorResourceList}>
							{resources.map((resource) => (
								<ResourceCard
									key={resource.resourceId}
									resource={resource}
									onActionChange={handleActionChange}
									isExpanded={expandedResources.has(resource.resourceId)}
									onExpandChange={handleExpandChange(resource.resourceId)}
									validationErrors={validationErrors}
								/>
							))}
						</div>
					</>
				) : (
					<JsonEditor
						ref={jsonEditorRef}
						resources={resources}
						mode={mode}
						onChange={handleJsonChange}
						onValidityChange={handleJsonValidityChange}
					/>
				)}
			</div>

			<ConfirmDialog
				open={showDiscardConfirm}
				onOpenChange={(next): void => {
					if (!next) {
						handleDiscardCancel();
					}
				}}
				title="Discard JSON changes?"
				titleIcon={<SolidAlertTriangle size={14} color="#fdd600" />}
				confirmText="Discard"
				confirmColor="destructive"
				cancelText="Stay in JSON"
				onConfirm={handleDiscardConfirm}
				onCancel={handleDiscardCancel}
			>
				<Typography>
					The JSON contains errors and cannot be parsed. Switching to Interactive
					mode will discard your changes.
				</Typography>
			</ConfirmDialog>
		</div>
	);
}

export default PermissionEditor;
