import { useCallback, useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Button } from '@signozhq/button';
import { DialogWrapper } from '@signozhq/dialog';
import { Check, Copy, RefreshCw, TriangleAlert } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { Skeleton } from 'antd';
import { getResetPasswordToken } from 'api/generated/services/users';
import { MEMBER_QUERY_PARAMS } from 'container/MembersSettings/constants';
import { parseAsStringEnum, useQueryState } from 'nuqs';

function ResetLinkDialog(): JSX.Element {
	const [memberId, setMemberId] = useQueryState(MEMBER_QUERY_PARAMS.MEMBER);
	const [linkType, setLinkType] = useQueryState(
		MEMBER_QUERY_PARAMS.RESET_LINK,
		parseAsStringEnum<'invite' | 'reset'>(['invite', 'reset']),
	);

	const open = !!linkType && !!memberId;

	const [resetLink, setResetLink] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [hasCopied, setHasCopied] = useState(false);

	useEffect(() => {
		if (!open || !memberId) {
			return;
		}

		let cancelled = false;

		async function fetchLink(): Promise<void> {
			setIsLoading(true);
			setFetchError(null);
			setResetLink(null);
			setHasCopied(false);

			try {
				const response = await getResetPasswordToken({ id: memberId as string });
				if (cancelled) {
					return;
				}
				if (response?.data?.token) {
					setResetLink(
						`${window.location.origin}/password-reset?token=${response.data.token}`,
					);
				} else {
					setFetchError('No token returned from server.');
				}
			} catch {
				if (!cancelled) {
					setFetchError('Failed to generate link. Please try again.');
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		}

		void fetchLink();

		return (): void => {
			cancelled = true;
		};
	}, [open, memberId]);

	const handleClose = useCallback((): void => {
		setLinkType(null);
		setMemberId(null);
		setResetLink(null);
		setFetchError(null);
	}, [setLinkType, setMemberId]);

	const [copyState, copyToClipboard] = useCopyToClipboard();

	const handleCopy = useCallback((): void => {
		if (!resetLink) {
			return;
		}
		copyToClipboard(resetLink);
		setHasCopied(true);
		setTimeout(() => setHasCopied(false), 2000);
		const message =
			linkType === 'invite'
				? 'Invite link copied to clipboard'
				: 'Reset link copied to clipboard';
		toast.success(message, { richColors: true });
	}, [resetLink, copyToClipboard, linkType]);

	useEffect(() => {
		if (copyState.error) {
			toast.error('Failed to copy link', { richColors: true });
		}
	}, [copyState.error]);

	const title = linkType === 'invite' ? 'Invite Link' : 'Password Reset Link';

	function renderContent(): JSX.Element {
		if (isLoading) {
			return <Skeleton active paragraph={{ rows: 2 }} />;
		}

		if (fetchError) {
			return (
				<div className="reset-link-dialog__error">
					<TriangleAlert size={16} className="reset-link-dialog__error-icon" />
					<span className="reset-link-dialog__error-text">{fetchError}</span>
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						onClick={(): void => {
							if (memberId) {
								setFetchError(null);
								setIsLoading(true);
								getResetPasswordToken({ id: memberId })
									.then((response) => {
										if (response?.data?.token) {
											setResetLink(
												`${window.location.origin}/password-reset?token=${response.data.token}`,
											);
										} else {
											setFetchError('No token returned from server.');
										}
									})
									.catch(() => {
										setFetchError('Failed to generate link. Please try again.');
									})
									.finally(() => setIsLoading(false));
							}
						}}
					>
						<RefreshCw size={12} />
						Retry
					</Button>
				</div>
			);
		}

		return (
			<div className="reset-link-dialog__content">
				<p className="reset-link-dialog__description">
					{linkType === 'invite'
						? 'Share this one-time link with the team member to complete their account setup.'
						: 'This creates a one-time link the team member can use to set a new password for their SigNoz account.'}
				</p>
				<div className="reset-link-dialog__link-row">
					<div className="reset-link-dialog__link-text-wrap">
						<span className="reset-link-dialog__link-text">{resetLink}</span>
					</div>
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						onClick={handleCopy}
						prefixIcon={hasCopied ? <Check size={12} /> : <Copy size={12} />}
						className="reset-link-dialog__copy-btn"
					>
						{hasCopied ? 'Copied!' : 'Copy'}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					handleClose();
				}
			}}
			title={title}
			showCloseButton
			width="base"
			className="reset-link-dialog"
		>
			{renderContent()}
		</DialogWrapper>
	);
}

export default ResetLinkDialog;
