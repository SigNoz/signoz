import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { Trash2, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type {
	AuthtypesUserWithRolesDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	getGetUserQueryKey,
	invalidateListUsers,
	useDeleteUser,
} from 'api/generated/services/users';
import { AxiosError } from 'axios';
import { MEMBER_QUERY_PARAMS } from 'container/MembersSettings/constants';
import { MemberStatus, toMemberStatus } from 'container/MembersSettings/utils';
import { parseAsBoolean, useQueryState } from 'nuqs';

function DeleteMemberDialog(): JSX.Element {
	const queryClient = useQueryClient();

	const [memberId, setMemberId] = useQueryState(MEMBER_QUERY_PARAMS.MEMBER);
	const [isDeleteOpen, setIsDeleteOpen] = useQueryState(
		MEMBER_QUERY_PARAMS.DELETE_MEMBER,
		parseAsBoolean.withDefault(false),
	);

	const open = !!isDeleteOpen && !!memberId;

	const cachedUser = memberId
		? queryClient.getQueryData<{ data: AuthtypesUserWithRolesDTO }>(
				getGetUserQueryKey({ id: memberId }),
		  )
		: null;

	const isInvited =
		toMemberStatus(cachedUser?.data?.status ?? '') === MemberStatus.Invited;
	const displayName = cachedUser?.data?.displayName || cachedUser?.data?.email;

	const title = isInvited ? 'Revoke Invite' : 'Delete Member';

	const { mutate: deleteUser, isLoading: isDeleting } = useDeleteUser({
		mutation: {
			onSuccess: async (): Promise<void> => {
				toast.success(
					isInvited ? 'Invite revoked successfully' : 'Member deleted successfully',
					{ richColors: true },
				);
				await setIsDeleteOpen(null);
				await setMemberId(null);
				await invalidateListUsers(queryClient);
			},
			onError: (error): void => {
				const errMessage =
					convertToApiError(
						error as AxiosError<RenderErrorResponseDTO, unknown> | null,
					)?.getErrorMessage() || 'An error occurred';
				const prefix = isInvited
					? 'Failed to revoke invite'
					: 'Failed to delete member';
				toast.error(`${prefix}: ${errMessage}`, { richColors: true });
			},
		},
	});

	function handleConfirm(): void {
		if (!memberId) {
			return;
		}
		deleteUser({ pathParams: { id: memberId } });
	}

	function handleCancel(): void {
		setIsDeleteOpen(null);
	}

	const body = isInvited ? (
		<>
			Are you sure you want to revoke the invite for <strong>{displayName}</strong>
			? They will no longer be able to join the workspace using this invite.
		</>
	) : (
		<>
			Are you sure you want to delete <strong>{displayName}</strong>? This will
			remove their access to the workspace.
		</>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					handleCancel();
				}
			}}
			title={title}
			width="narrow"
			className="alert-dialog delete-dialog"
			showCloseButton={false}
			disableOutsideClick={false}
		>
			<p className="delete-dialog__body">{body}</p>

			<DialogFooter className="delete-dialog__footer">
				<Button variant="solid" color="secondary" size="sm" onClick={handleCancel}>
					<X size={12} />
					Cancel
				</Button>
				<Button
					variant="solid"
					color="destructive"
					size="sm"
					disabled={isDeleting}
					onClick={handleConfirm}
				>
					<Trash2 size={12} />
					{isDeleting ? 'Processing...' : title}
				</Button>
			</DialogFooter>
		</DialogWrapper>
	);
}

export default DeleteMemberDialog;
