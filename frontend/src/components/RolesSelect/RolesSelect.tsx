import { CircleAlert, RefreshCw } from '@signozhq/icons';
import { Checkbox, Select } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useListRoles } from 'api/generated/services/role';
import type { AuthtypesRoleDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import APIError from 'types/api/error';
import { popupContainer } from 'utils/selectPopupContainer';

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
	getPopupContainer?: (trigger: HTMLElement) => HTMLElement;
	roles?: AuthtypesRoleDTO[];
	loading?: boolean;
	isError?: boolean;
	error?: APIError;
	onRefetch?: () => void;
}

interface SingleProps extends BaseProps {
	mode?: 'single';
	value?: string;
	onChange?: (role: string) => void;
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
	const options = getRoleOptions(roles);

	const {
		mode,
		id,
		placeholder = 'Select role',
		className,
		getPopupContainer = popupContainer,
		loading = internalLoading,
		isError = internalError,
		error = convertToApiError(internalErrorObj),
		onRefetch = externalRoles === undefined ? internalRefetch : undefined,
	} = props;

	const notFoundContent = isError ? (
		<ErrorContent error={error} onRefetch={onRefetch} />
	) : undefined;

	if (mode === 'multiple') {
		const { value = [], onChange } = props as MultipleProps;
		return (
			<Select
				id={id}
				mode="multiple"
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				className={cx('roles-select', className)}
				loading={loading}
				notFoundContent={notFoundContent}
				options={options}
				optionRender={(option): JSX.Element => (
					<Checkbox
						checked={value.includes(option.value as string)}
						style={{ pointerEvents: 'none' }}
					>
						{option.label}
					</Checkbox>
				)}
				getPopupContainer={getPopupContainer}
			/>
		);
	}

	const { value, onChange } = props as SingleProps;
	return (
		<Select
			id={id}
			value={value || undefined}
			onChange={onChange}
			placeholder={placeholder}
			className={cx('roles-single-select', className)}
			loading={loading}
			notFoundContent={notFoundContent}
			options={options}
			getPopupContainer={getPopupContainer}
		/>
	);
}

export default RolesSelect;
