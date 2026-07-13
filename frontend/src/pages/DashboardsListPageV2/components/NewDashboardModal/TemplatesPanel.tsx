import { type ChangeEvent, type KeyboardEvent, useState } from 'react';
import {
	Check,
	LayoutDashboard,
	LoaderCircle,
	SquareArrowOutUpRight,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { toast } from '@signozhq/ui/sonner';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';

import styles from './NewDashboardModal.module.scss';

const TEMPLATES_DOCS_URL =
	'https://signoz.io/docs/dashboards/dashboard-templates/overview/';

// Templates aren't served by the BE yet, so this tab is a browse-and-request
// placeholder: link out to the published template library, and let cloud users
// request one we haven't built.
function TemplatesPanel(): JSX.Element {
	const { isCloudUser } = useGetTenantLicense();
	const [name, setName] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const requestName = name.trim();

	const handleRequest = async (): Promise<void> => {
		if (!requestName || submitting) {
			return;
		}
		try {
			setSubmitting(true);
			const response = await logEvent('Dashboard Requested', {
				screen: 'Dashboard list page',
				dashboard: requestName,
			});
			if (response.statusCode === 200) {
				toast.success('Dashboard request submitted');
				setName('');
			} else {
				toast.error(response.error || 'Something went wrong');
			}
		} catch {
			toast.error('Something went wrong');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.templatesPanel}>
			<span className={styles.templatesIcon}>
				<LayoutDashboard size={20} />
			</span>
			<Typography variant="title" size="lg" weight="semibold">
				Dashboard templates
			</Typography>
			<Typography
				variant="text"
				size="sm"
				color="muted"
				className={styles.templatesDesc}
			>
				Browse our library of ready-made dashboards, or request a new one and
				we&apos;ll build it for you.
			</Typography>

			<a
				className={styles.browseLink}
				href={TEMPLATES_DOCS_URL}
				target="_blank"
				rel="noopener noreferrer"
			>
				Browse dashboard templates
				<SquareArrowOutUpRight size={14} />
			</a>

			{isCloudUser && (
				<div className={styles.requestForm}>
					<Input
						className={styles.requestInput}
						placeholder="Enter dashboard name..."
						value={name}
						testId="request-dashboard-name"
						onChange={(e: ChangeEvent<HTMLInputElement>): void =>
							setName(e.target.value)
						}
						onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
							if (e.key === 'Enter') {
								void handleRequest();
							}
						}}
					/>
					<Button
						variant="solid"
						color="primary"
						size="md"
						disabled={submitting || requestName.length === 0}
						testId="request-dashboard-submit"
						prefix={
							submitting ? (
								<LoaderCircle size={14} className={styles.spinner} />
							) : (
								<Check size={14} />
							)
						}
						onClick={(): void => {
							void handleRequest();
						}}
					>
						Submit
					</Button>
				</div>
			)}
		</div>
	);
}

export default TemplatesPanel;
