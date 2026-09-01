import React, { useRef } from 'react';
import { CircleAlert, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import RolesSelect from 'components/RolesSelect/RolesSelect';
import * as XLSX from 'xlsx';

import styles from './InviteMembers.module.scss';
import { InviteMembersProps } from './types';
import { useInviteMembers } from './useInviteMembers';

function InviteMembers({
	className,
	emailPlaceholder = 'e.g. john@signoz.io, alice@signoz.io',
	showHeader = true,
	onSuccess,
	onPartialSuccess,
	onAllFailed,
	renderFooter,
}: InviteMembersProps): JSX.Element {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const {
		emailsText,
		setEmailsText,
		globalRoleIds,
		setGlobalRoleIds,
		hasInvalidEmails,
		hasInvalidRoles,
		isSubmitting,
		inviteResults,
		reset,
		submit,
		failedResults,
		successResults,
		canSubmit,
		invalidEmailsList,
		setParsedNames,
		setParsedDomains,
	} = useInviteMembers({
		onSuccess,
		onPartialSuccess,
		onAllFailed,
	});

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}

		const reader = new FileReader();
		reader.onload = (event): void => {
			try {
				const arrayBuffer = event.target?.result as ArrayBuffer;
				const data = new Uint8Array(arrayBuffer);
				const workbook = XLSX.read(data, { type: 'array' });

				const sheetName = workbook.SheetNames[0];
				const sheet = workbook.Sheets[sheetName];
				const rows: any[] = XLSX.utils.sheet_to_json(sheet);

				// eslint-disable-next-line no-console
				console.log('Parsed Excel Rows:', rows);

				const emails: string[] = [];
				const namesMap: Record<string, string> = {};
				const domainsMap: Record<string, string> = {};

				rows.forEach((row: any) => {
					// Cari key kolom dengan menghapus spasi dan case-insensitive
					const emailKey = Object.keys(row).find(
						(key) => key.toLowerCase().replace(/\s+/g, '') === 'email',
					);
					const nameKey = Object.keys(row).find(
						(key) => key.toLowerCase().replace(/\s+/g, '') === 'name',
					);
					const domainKey = Object.keys(row).find(
						(key) => key.toLowerCase().replace(/\s+/g, '') === 'domain',
					);

					const emailVal = emailKey ? String(row[emailKey]).trim() : '';
					const nameVal = nameKey ? String(row[nameKey]).trim() : '';
					const domainVal = domainKey ? String(row[domainKey]).trim() : '';

					if (emailVal) {
						emails.push(emailVal);
						const lowerEmail = emailVal.toLowerCase();
						namesMap[lowerEmail] = nameVal;
						domainsMap[lowerEmail] = domainVal;
					}
				});

				if (emails.length > 0) {
					setEmailsText(emails.join(', '));
					setParsedNames(namesMap);
					setParsedDomains(domainsMap);
				} else {
					console.warn('No email addresses found in the uploaded file.');
				}
			} catch (error) {
				console.error('Error parsing Excel file:', error);
			}
		};
		reader.readAsArrayBuffer(file);
	};

	const handleExportExcel = (): void => {
		if (!inviteResults || inviteResults.length === 0) {
			return;
		}

		const formattedRows = inviteResults.map((r) => ({
			Domain: r.domain || '',
			Name: r.name || '',
			Email: r.email,
			'Invitation Link': r.inviteLink || '',
		}));

		const worksheet = XLSX.utils.json_to_sheet(formattedRows);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Invitation Links');
		XLSX.writeFile(workbook, 'signoz_invitation_links.xlsx');
	};

	const getValidationErrorMessage = (): string => {
		if (hasInvalidEmails && hasInvalidRoles) {
			return 'Please enter valid emails and select roles for team members';
		}
		if (hasInvalidEmails) {
			return `Please enter valid emails. Invalid emails: ${invalidEmailsList.join(', ')}`;
		}
		return 'Please select roles for team members';
	};

	const hasValidationErrors = hasInvalidEmails || hasInvalidRoles;
	const hasResults = inviteResults !== null;
	const hasFailures = failedResults.length > 0;
	const hasSuccesses = successResults.length > 0;

	return (
		<div className={cx(styles.inviteMembers, className)}>
			<div className={styles.table}>
				{showHeader && (
					<div
						style={{
							marginBottom: '8px',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
						}}
					>
						<div>
							<Typography.Text size="base" weight="semibold">
								Email Addresses
							</Typography.Text>
							<p
								style={{
									color: 'var(--l3-foreground)',
									fontSize: '12px',
									marginTop: '2px',
									marginBottom: '8px',
								}}
							>
								Enter emails separated by commas/newlines, or upload an Excel file.
							</p>
						</div>

						<div>
							<input
								type="file"
								ref={fileInputRef}
								onChange={handleFileUpload}
								accept=".xlsx, .xls, .csv"
								style={{ display: 'none' }}
							/>
							<Button
								variant="dashed"
								color="secondary"
								prefix={<Plus size={12} />}
								onClick={(): void => fileInputRef.current?.click()}
								data-testid="invite-excel-upload"
							>
								Upload Excel File
							</Button>
						</div>
					</div>
				)}

				<textarea
					rows={6}
					placeholder={emailPlaceholder}
					value={emailsText}
					onChange={(e): void => setEmailsText(e.target.value)}
					name="invite-emails-textarea"
					data-testid="invite-emails-textarea"
					style={{
						width: '100%',
						padding: '10px',
						borderRadius: '4px',
						backgroundColor: 'var(--l2-background, #141416)',
						color: 'var(--l1-foreground, #ffffff)',
						border: '1px solid var(--border-color, #27282e)',
						fontFamily: 'inherit',
						resize: 'vertical',
					}}
				/>

				<div style={{ marginTop: '16px', marginBottom: '8px' }}>
					<Typography.Text size="base" weight="semibold">
						Select Roles for these members
					</Typography.Text>
				</div>

				<div style={{ width: '100%' }}>
					<RolesSelect
						mode="multiple"
						value={globalRoleIds}
						onChange={(roleIds): void => setGlobalRoleIds(roleIds)}
						placeholder="Select roles for all listed users"
						id="invite-roles-global"
					/>
				</div>
			</div>

			{hasValidationErrors && (
				<Callout
					type="error"
					size="small"
					showIcon
					icon={<CircleAlert size={12} />}
					className={styles.callout}
					data-testid="invite-validation-error"
				>
					{getValidationErrorMessage()}
				</Callout>
			)}

			{hasResults && hasFailures && (
				<Callout
					type="error"
					size="small"
					showIcon
					icon={<CircleAlert size={12} />}
					className={styles.callout}
					data-testid="invite-api-error"
				>
					<div className={styles.results}>
						{hasSuccesses && (
							<Typography.Text size="small">
								{successResults.length} invite(s) sent successfully.
							</Typography.Text>
						)}
						<Typography.Text size="small">
							{failedResults.length} invite(s) failed:
						</Typography.Text>
						<ul className={styles.resultsList}>
							{failedResults.map((result) => (
								<li key={result.email}>
									<Typography.Text size="small">
										{result.email}: {result.error}
									</Typography.Text>
								</li>
							))}
						</ul>
					</div>
				</Callout>
			)}

			{hasResults && hasSuccesses && (
				<Callout
					type="success"
					size="small"
					showIcon
					className={styles.callout}
					data-testid="invite-success"
				>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							width: '100%',
						}}
					>
						<Typography.Text size="small">
							{successResults.length} invite(s) processed successfully!
						</Typography.Text>
						<Button
							variant="solid"
							color="primary"
							onClick={handleExportExcel}
							style={{ marginLeft: '16px' }}
						>
							Download Excel Hasil
						</Button>
					</div>
				</Callout>
			)}

			{renderFooter?.({
				submit,
				reset,
				canSubmit,
				isSubmitting,
				touchedCount: emailsText.trim() ? 1 : 0,
			})}
		</div>
	);
}

export default InviteMembers;
