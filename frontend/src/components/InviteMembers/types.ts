import { ReactNode } from 'react';

export interface InviteMemberRow {
	id: string;
	email: string;
	roleId: string;
}

export interface InviteResult {
	email: string;
	success: boolean;
	error?: string;
}

export interface FooterRenderProps {
	submit: () => Promise<InviteResult[]>;
	reset: () => void;
	canSubmit: boolean;
	isSubmitting: boolean;
	touchedCount: number;
}

export interface UseInviteMembersOptions {
	initialRowCount?: number;
	onSuccess?: () => void;
	onPartialSuccess?: (results: InviteResult[]) => void;
	onAllFailed?: (results: InviteResult[]) => void;
}

export interface UseInviteMembersReturn {
	rows: InviteMemberRow[];
	emailValidity: Record<string, boolean>;
	hasInvalidEmails: boolean;
	hasInvalidRoles: boolean;
	isSubmitting: boolean;
	inviteResults: InviteResult[] | null;

	addRow: () => void;
	removeRow: (id: string) => void;
	updateEmail: (id: string, email: string) => void;
	updateRole: (id: string, roleId: string | undefined) => void;
	reset: () => void;
	submit: () => Promise<InviteResult[]>;

	touchedRows: InviteMemberRow[];
	failedResults: InviteResult[];
	successResults: InviteResult[];
	canSubmit: boolean;
}

export interface InviteMembersProps {
	className?: string;
	initialRowCount?: number;
	minRows?: number;
	emailPlaceholder?: string;
	showHeader?: boolean;
	showAddButton?: boolean;

	onSuccess?: () => void;
	onPartialSuccess?: (results: InviteResult[]) => void;
	onAllFailed?: (results: InviteResult[]) => void;

	renderFooter?: (props: FooterRenderProps) => ReactNode;
}
