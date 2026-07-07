import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { toast } from '@signozhq/ui/sonner';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import type { ErrorType } from 'api/generatedAPIInstance';
import ROUTES from 'constants/routes';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import APIError from 'types/api/error';
import { toAPIError } from 'utils/errorUtils';

import type { ResourcePermissions } from '../types';
import type { EditorMode } from './components/JsonEditor.types';
import {
	createEmptyRolePermissions,
	useCreateRolePermissions,
	useRolePermissions,
	useUpdateRolePermissions,
} from '../hooks/useRolePermissions';
import { useRoleAuthZ } from '../hooks/useRoleAuthZ';
import {
	useRoleUnsavedChanges,
	type RoleFormData,
} from './useRoleUnsavedChanges';
import { useRoleFormValidation } from './useRoleFormValidation';

const EDITOR_MODES: EditorMode[] = ['interactive', 'json'];

interface UseCreateEditRolePageCallbacksResult {
	formData: RoleFormData;
	setFormData: React.Dispatch<React.SetStateAction<RoleFormData>>;
	editorMode: EditorMode;
	setEditorMode: (mode: EditorMode) => void;
	resources: ResourcePermissions[];
	setResources: (resources: ResourcePermissions[]) => void;
	isLoading: boolean;
	isSaving: boolean;
	hasUnsavedChanges: boolean;
	handleSave: () => Promise<boolean>;
	handleCancel: () => void;
	handleFormChange: (field: keyof RoleFormData, value: string) => void;
	isCreateMode: boolean;
	loadError: APIError | null;
	saveError: APIError | null;
	clearSaveError: () => void;
	validationErrors: Set<string>;
	hasRequiredPermission: boolean;
	isAuthZLoading: boolean;
	deniedPermission: string;
}

export function useCreateEditRolePageActions(
	roleId: string,
	roleName: string,
): UseCreateEditRolePageCallbacksResult {
	const history = useHistory();
	const isCreateMode = roleId === 'new';

	const {
		hasCreatePermission,
		hasReadPermission,
		hasUpdatePermission,
		isAuthZLoading,
	} = useRoleAuthZ(roleName);

	const deniedPermission = useMemo(() => {
		if (isCreateMode) {
			return 'role:create';
		}
		if (roleName) {
			return `role:${roleName}:update`;
		}
		return `role:<missing-rule-name>:update`;
	}, [isCreateMode, roleName]);

	const [formData, setFormData] = useState<RoleFormData>({
		name: '',
		description: '',
	});
	const [editorMode, setEditorMode] = useQueryState(
		'viewMode',
		parseAsStringLiteral(EDITOR_MODES).withDefault('interactive'),
	);
	const emptyResources = useMemo(() => createEmptyRolePermissions(), []);
	const [localResources, setLocalResources] = useState<ResourcePermissions[]>(
		() => (isCreateMode ? createEmptyRolePermissions() : []),
	);
	const [isInitialized, setIsInitialized] = useState(false);
	const [saveError, setSaveError] = useState<APIError | null>(null);

	const { validationErrors, validateResources, clearValidationErrors } =
		useRoleFormValidation();

	const {
		data: rolePermissionsData,
		isLoading: isLoadingPermissions,
		error: rolePermissionsError,
	} = useRolePermissions(roleId, {
		enabled: !isCreateMode,
	});

	const loadError = rolePermissionsError
		? toAPIError(rolePermissionsError, 'Failed to load role')
		: null;

	const { mutateAsync: createRole, isLoading: isCreating } =
		useCreateRolePermissions();
	const { mutateAsync: updateRole, isLoading: isUpdating } =
		useUpdateRolePermissions();
	const isSaving = isCreating || isUpdating;

	useEffect(() => {
		if (rolePermissionsData && !isInitialized) {
			setFormData({
				name: rolePermissionsData.roleName,
				description: rolePermissionsData.roleDescription,
			});
			setLocalResources(JSON.parse(JSON.stringify(rolePermissionsData.resources)));
			setIsInitialized(true);
		}
	}, [rolePermissionsData, isInitialized]);

	const handleFormChange = useCallback(
		(field: keyof RoleFormData, value: string): void => {
			setFormData((prev) => ({
				...prev,
				[field]: value,
			}));
			clearValidationErrors();
			setSaveError(null);
		},
		[clearValidationErrors],
	);

	const handleModeChange = useCallback(
		(mode: EditorMode): void => {
			void setEditorMode(mode);
		},
		[setEditorMode],
	);

	const handleResourcesChange = useCallback(
		(resources: ResourcePermissions[]): void => {
			setLocalResources(resources);
			clearValidationErrors();
			setSaveError(null);
		},
		[clearValidationErrors],
	);

	const hasUnsavedChanges = useRoleUnsavedChanges(
		isCreateMode,
		formData,
		localResources,
		rolePermissionsData,
		emptyResources,
	);

	const handleSave = useCallback(async (): Promise<boolean> => {
		if (!formData.name.trim()) {
			setSaveError(
				new APIError({
					httpStatusCode: 400,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Role name is required',
						url: '',
						errors: [],
					},
				}),
			);
			return false;
		}

		const validationError = validateResources(localResources);
		if (validationError) {
			setSaveError(
				new APIError({
					httpStatusCode: 400,
					error: {
						code: 'VALIDATION_ERROR',
						message: validationError,
						url: '',
						errors: [],
					},
				}),
			);
			return false;
		}

		clearValidationErrors();
		setSaveError(null);

		try {
			if (isCreateMode) {
				await createRole({
					name: formData.name,
					description: formData.description,
					resources: localResources,
				});
			} else {
				await updateRole({
					roleId,
					description: formData.description,
					resources: localResources,
				});
			}
			toast.success(
				isCreateMode ? 'Role created successfully' : 'Role updated successfully',
				{ position: 'bottom-center' },
			);
			return true;
		} catch (error) {
			setSaveError(
				toAPIError(
					error as ErrorType<RenderErrorResponseDTO>,
					'Failed to save role',
				),
			);
			return false;
		}
	}, [
		formData.name,
		formData.description,
		isCreateMode,
		roleId,
		localResources,
		createRole,
		updateRole,
		validateResources,
		clearValidationErrors,
	]);

	const clearSaveError = useCallback((): void => {
		setSaveError(null);
	}, []);

	const handleCancel = useCallback((): void => {
		if (isCreateMode) {
			history.push(ROUTES.ROLES_SETTINGS);
		} else {
			const viewUrl = `${ROUTES.ROLE_DETAILS.replace(':roleId', roleId)}?name=${encodeURIComponent(roleName)}`;
			history.push(viewUrl);
		}
	}, [history, isCreateMode, roleId, roleName]);

	return {
		formData,
		setFormData,
		editorMode,
		setEditorMode: handleModeChange,
		resources: localResources,
		setResources: handleResourcesChange,
		isLoading: isLoadingPermissions,
		isSaving,
		hasUnsavedChanges,
		handleSave,
		handleCancel,
		handleFormChange,
		isCreateMode,
		loadError,
		saveError,
		clearSaveError,
		validationErrors,
		hasRequiredPermission: isCreateMode
			? hasCreatePermission
			: hasReadPermission && hasUpdatePermission,
		isAuthZLoading,
		deniedPermission,
	};
}
