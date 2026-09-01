import { ReactNode } from 'react';

export interface InviteMemberRow {
	id: string;
	email: string;
	roleIds: string[];
}

export interface InviteResult {
	email: string;
	name?: string;
	domain?: string;
	inviteLink?: string;
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
	onSuccess?: (results: InviteResult[], rows: InviteMemberRow[]) => void;
	onPartialSuccess?: (results: InviteResult[], rows: InviteMemberRow[]) => void;
	onAllFailed?: (results: InviteResult[], rows: InviteMemberRow[]) => void;
}

export interface UseInviteMembersReturn {
	emailsText: string;
	setEmailsText: (text: string) => void;
	globalRoleIds: string[];
	setGlobalRoleIds: (roleIds: string[]) => void;
	hasInvalidEmails: boolean;
	hasInvalidRoles: boolean;
	isSubmitting: boolean;
	inviteResults: InviteResult[] | null;

	reset: () => void;
	submit: () => Promise<InviteResult[]>;

	failedResults: InviteResult[];
	successResults: InviteResult[];
	canSubmit: boolean;
	invalidEmailsList: string[];

	parsedNames: Record<string, string>;
	setParsedNames: React.Dispatch<React.SetStateAction<Record<string, string>>>;
	parsedDomains: Record<string, string>;
	setParsedDomains: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export interface InviteMembersProps {
	className?: string;
	initialRowCount?: number;
	minRows?: number;
	emailPlaceholder?: string;
	showHeader?: boolean;
	showAddButton?: boolean;

	onSuccess?: (results: InviteResult[], rows: InviteMemberRow[]) => void;
	onPartialSuccess?: (results: InviteResult[], rows: InviteMemberRow[]) => void;
	onAllFailed?: (results: InviteResult[], rows: InviteMemberRow[]) => void;

	renderFooter?: (props: FooterRenderProps) => ReactNode;
}
