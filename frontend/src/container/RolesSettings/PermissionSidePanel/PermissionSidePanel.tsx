import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@signozhq/button';
import { ChevronDown, ChevronRight, X } from '@signozhq/icons';
import {
	RadioGroup,
	RadioGroupItem,
	RadioGroupLabel,
} from '@signozhq/radio-group';
import { Select, Skeleton } from 'antd';

import {
	buildConfig,
	configsEqual,
	DEFAULT_RESOURCE_CONFIG,
	isResourceConfigEqual,
} from '../utils';
import type {
	PermissionConfig,
	PermissionSidePanelProps,
	ResourceConfig,
	ResourceDefinition,
	ScopeType,
} from './PermissionSidePanel.types';
import { PermissionScope } from './PermissionSidePanel.types';

import './PermissionSidePanel.styles.scss';

interface ResourceRowProps {
	resource: ResourceDefinition;
	config: ResourceConfig;
	isExpanded: boolean;
	onToggleExpand: (id: string) => void;
	onScopeChange: (id: string, scope: ScopeType) => void;
	onSelectedIdsChange: (id: string, ids: string[]) => void;
}

function ResourceRow({
	resource,
	config,
	isExpanded,
	onToggleExpand,
	onScopeChange,
	onSelectedIdsChange,
}: ResourceRowProps): JSX.Element {
	return (
		<div className="psp-resource">
			<div
				className={`psp-resource__row${
					isExpanded ? ' psp-resource__row--expanded' : ''
				}`}
				role="button"
				tabIndex={0}
				onClick={(): void => onToggleExpand(resource.id)}
				onKeyDown={(e): void => {
					if (e.key === 'Enter' || e.key === ' ') {
						onToggleExpand(resource.id);
					}
				}}
			>
				<div className="psp-resource__left">
					<span className="psp-resource__chevron">
						{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
					</span>
					<span className="psp-resource__label">{resource.label}</span>
				</div>
			</div>

			{isExpanded && (
				<div className="psp-resource__body">
					<RadioGroup
						value={config.scope}
						onValueChange={(val): void =>
							onScopeChange(resource.id, val as ScopeType)
						}
						className="psp-resource__radio-group"
					>
						<div className="psp-resource__radio-item">
							<RadioGroupItem
								value={PermissionScope.ALL}
								id={`${resource.id}-all`}
								color="robin"
							/>
							<RadioGroupLabel htmlFor={`${resource.id}-all`}>All</RadioGroupLabel>
						</div>

						<div className="psp-resource__radio-item">
							<RadioGroupItem
								value={PermissionScope.ONLY_SELECTED}
								id={`${resource.id}-only-selected`}
								color="robin"
							/>
							<RadioGroupLabel htmlFor={`${resource.id}-only-selected`}>
								Only selected
							</RadioGroupLabel>
						</div>
					</RadioGroup>

					{config.scope === PermissionScope.ONLY_SELECTED && (
						<div className="psp-resource__select-wrapper">
							{/* TODO: right now made to only accept user input, we need to give it proper resource based value fetching from APIs */}
							<Select
								mode="tags"
								value={config.selectedIds}
								onChange={(vals: string[]): void =>
									onSelectedIdsChange(resource.id, vals)
								}
								options={resource.options ?? []}
								placeholder="Select resources..."
								className="psp-resource__select"
								popupClassName="psp-resource__select-popup"
								showSearch
								filterOption={(input, option): boolean =>
									String(option?.label ?? '')
										.toLowerCase()
										.includes(input.toLowerCase())
								}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function PermissionSidePanel({
	open,
	onClose,
	permissionLabel,
	resources,
	initialConfig,
	isLoading = false,
	isSaving = false,
	onSave,
}: PermissionSidePanelProps): JSX.Element | null {
	const [config, setConfig] = useState<PermissionConfig>(() =>
		buildConfig(resources, initialConfig),
	);
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (open) {
			setConfig(buildConfig(resources, initialConfig));
			setExpandedIds(new Set());
		}
	}, [open, resources, initialConfig]);

	const savedConfig = useMemo(() => buildConfig(resources, initialConfig), [
		resources,
		initialConfig,
	]);

	const unsavedCount = useMemo(() => {
		if (configsEqual(config, savedConfig)) {
			return 0;
		}
		return Object.keys(config).filter(
			(id) => !isResourceConfigEqual(config[id], savedConfig[id]),
		).length;
	}, [config, savedConfig]);

	const updateResource = useCallback(
		(id: string, patch: Partial<ResourceConfig>): void => {
			setConfig((prev) => ({
				...prev,
				[id]: { ...prev[id], ...patch },
			}));
		},
		[],
	);

	const handleToggleExpand = useCallback((id: string): void => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleScopeChange = useCallback(
		(id: string, scope: ScopeType): void => {
			updateResource(id, { scope, selectedIds: [] });
		},
		[updateResource],
	);

	const handleSelectedIdsChange = useCallback(
		(id: string, ids: string[]): void => {
			updateResource(id, { selectedIds: ids });
		},
		[updateResource],
	);

	const handleSave = useCallback((): void => {
		onSave(config);
	}, [config, onSave]);

	const handleDiscard = useCallback((): void => {
		setConfig(buildConfig(resources, initialConfig));
		setExpandedIds(new Set());
	}, [resources, initialConfig]);

	if (!open) {
		return null;
	}

	return (
		<>
			<div
				className="permission-side-panel-backdrop"
				role="presentation"
				onClick={onClose}
			/>

			<div className="permission-side-panel">
				<div className="permission-side-panel__header">
					<Button
						variant="ghost"
						size="icon"
						className="permission-side-panel__close"
						onClick={onClose}
						aria-label="Close panel"
					>
						<X size={16} />
					</Button>
					<span className="permission-side-panel__header-divider" />
					<span className="permission-side-panel__title">
						Edit {permissionLabel} Permissions
					</span>
				</div>

				<div className="permission-side-panel__content">
					{isLoading ? (
						<Skeleton active paragraph={{ rows: 6 }} />
					) : (
						<div className="permission-side-panel__resource-list">
							{resources.map((resource) => (
								<ResourceRow
									key={resource.id}
									resource={resource}
									config={config[resource.id] ?? DEFAULT_RESOURCE_CONFIG}
									isExpanded={expandedIds.has(resource.id)}
									onToggleExpand={handleToggleExpand}
									onScopeChange={handleScopeChange}
									onSelectedIdsChange={handleSelectedIdsChange}
								/>
							))}
						</div>
					)}
				</div>

				<div className="permission-side-panel__footer">
					{unsavedCount > 0 && (
						<div className="permission-side-panel__unsaved">
							<span className="permission-side-panel__unsaved-dot" />
							<span className="permission-side-panel__unsaved-text">
								{unsavedCount} unsaved change{unsavedCount !== 1 ? 's' : ''}
							</span>
						</div>
					)}

					<div className="permission-side-panel__footer-actions">
						<Button
							variant="solid"
							color="secondary"
							prefixIcon={<X size={14} />}
							onClick={unsavedCount > 0 ? handleDiscard : onClose}
							size="sm"
							disabled={isSaving}
						>
							{unsavedCount > 0 ? 'Discard' : 'Cancel'}
						</Button>
						<Button
							variant="solid"
							color="primary"
							size="sm"
							onClick={handleSave}
							loading={isSaving}
							disabled={isLoading || unsavedCount === 0}
						>
							Save Changes
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}

export default PermissionSidePanel;
