import { useMemo } from 'react';
import { Combobox, type ComboboxOptionItemType } from '@signozhq/ui/combobox';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useListRoles } from 'api/generated/services/role';
import type { AuthtypesGettableRoleDTO } from 'api/generated/services/sigNoz.schemas';
import APIError from 'types/api/error';

import RolesSelectError from './RolesSelectError';

export function useRoles(): {
	roles: AuthtypesGettableRoleDTO[];
	isLoading: boolean;
	isError: boolean;
	error: APIError | undefined;
	refetch: () => void;
} {
	const { data, isLoading, isError, error, refetch } = useListRoles();
	return {
		roles: data?.data ?? [],
		isLoading,
		isError,
		error: convertToApiError(error),
		refetch,
	};
}

export function getRoleOptions(
	roles: AuthtypesGettableRoleDTO[],
	valueField: 'id' | 'name',
): ComboboxOptionItemType[] {
	return roles.map((role) => ({
		type: 'item',
		label: role.name ?? '',
		value: role[valueField] ?? '',
	}));
}

interface BaseProps {
	id?: string;
	placeholder?: string;
	roles?: AuthtypesGettableRoleDTO[];
	loading?: boolean;
	isError?: boolean;
	error?: APIError;
	onRefetch?: () => void;
	valueField?: 'id' | 'name';
	testId?: string;
}

interface SingleProps extends BaseProps {
	mode?: 'single';
	value?: string;
	onChange?: (role: string | undefined) => void;
	allowClear?: boolean;
}

interface MultipleProps extends BaseProps {
	mode: 'multiple';
	value?: string[];
	onChange?: (roles: string[]) => void;
}

export type RolesSelectProps = SingleProps | MultipleProps;

function RolesSelect(props: RolesSelectProps): JSX.Element {
	const externalRoles = props.roles;

	const {
		data,
		isLoading: internalLoading,
		isError: internalError,
		error: internalErrorObj,
		refetch: internalRefetch,
	} = useListRoles({
		query: { enabled: externalRoles === undefined },
	});

	const roles = externalRoles ?? data?.data;
	const valueField = props.valueField || 'id';
	const items = useMemo(
		() => getRoleOptions(roles ?? [], valueField),
		[roles, valueField],
	);

	const {
		id,
		placeholder = 'Select role',
		loading = internalLoading,
		isError = internalError,
		error = convertToApiError(internalErrorObj),
		onRefetch = externalRoles === undefined ? internalRefetch : undefined,
		testId,
	} = props;

	// A selected value missing from `items` still lists as a row, which hides
	// `noContent`, so the failure is reported in the footer while it can be retried.
	const errorFooter =
		isError && onRefetch
			? {
					label: <RolesSelectError error={error} canRetry />,
					onClick: onRefetch,
					testId: 'roles-select-retry',
				}
			: undefined;

	const sharedProps = {
		id,
		items,
		placeholder,
		loading,
		testId,
		searchInputProps: { placeholder: 'Search roles' },
		footerAction: errorFooter,
		noContent:
			isError && !onRefetch ? (
				<RolesSelectError error={error} canRetry={false} />
			) : (
				'No roles found'
			),
	};

	if (props.mode === 'multiple') {
		return (
			<Combobox
				{...sharedProps}
				multiple
				value={props.value ?? []}
				onChange={props.onChange}
			/>
		);
	}

	return (
		<Combobox
			{...sharedProps}
			value={props.value || undefined}
			onChange={props.onChange}
			allowClear={props.allowClear ?? true}
		/>
	);
}

export default RolesSelect;
