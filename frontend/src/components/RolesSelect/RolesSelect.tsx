import { CircleAlert, RefreshCw } from '@signozhq/icons';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useListRoles } from 'api/generated/services/role';
import type { AuthtypesRoleDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import APIError from 'types/api/error';

import './RolesSelect.styles.scss';

export interface RoleOption {
	label: string;
	value: string;
}

export function useRoles(): {
	roles: AuthtypesRoleDTO[];
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

export function getRoleOptions(roles: AuthtypesRoleDTO[]): RoleOption[] {
	return roles.map((role) => ({
		label: role.name ?? '',
		value: role.id ?? '',
	}));
}

function ErrorContent({
	error,
	onRefetch,
}: {
	error?: APIError;
	onRefetch?: () => void;
}): JSX.Element {
	const errorMessage = error?.message || 'Failed to load roles';

	return (
		<div className="roles-select-error">
			<span className="roles-select-error__msg">
				<CircleAlert size={12} />
				{errorMessage}
			</span>
			{onRefetch && (
				<button
					type="button"
					onClick={(e): void => {
						e.stopPropagation();
						onRefetch();
					}}
					className="roles-select-error__retry-btn"
					title="Retry"
				>
					<RefreshCw size={12} />
				</button>
			)}
		</div>
	);
}

interface BaseProps {
	id?: string;
	placeholder?: string;
	className?: string;
	roles?: AuthtypesRoleDTO[];
	loading?: boolean;
	isError?: boolean;
	error?: APIError;
	onRefetch?: () => void;
	disabled?: boolean;
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

	const roles = externalRoles ?? data?.data ?? [];
	const items: ComboboxSimpleItem[] = getRoleOptions(roles);

	const {
		mode,
		id,
		placeholder = 'Select role',
		className,
		loading = internalLoading,
		isError = internalError,
		error = convertToApiError(internalErrorObj),
		onRefetch = externalRoles === undefined ? internalRefetch : undefined,
		disabled,
	} = props;

	const emptyPlaceholder = isError
		? error?.message || 'Failed to load roles'
		: 'No roles available';

	if (mode === 'multiple') {
		const { value = [], onChange } = props as MultipleProps;
		return (
			<>
				<ComboboxSimple
					id={id}
					multiple
					value={value}
					onChange={(v): void => onChange?.(v as string[])}
					placeholder={placeholder}
					className={cx('roles-select', className)}
					loading={loading}
					emptyPlaceholder={emptyPlaceholder}
					items={items}
					style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
				/>
				{isError && <ErrorContent error={error} onRefetch={onRefetch} />}
			</>
		);
	}

	const { value, onChange } = props as SingleProps;
	return (
		<>
			<ComboboxSimple
				id={id}
				value={value || undefined}
				onChange={(v): void => onChange?.((v as string) || undefined)}
				placeholder={placeholder}
				className={cx('roles-single-select', className)}
				loading={loading}
				emptyPlaceholder={emptyPlaceholder}
				items={items}
				style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
			/>
			{isError && <ErrorContent error={error} onRefetch={onRefetch} />}
		</>
	);
}

export default RolesSelect;
