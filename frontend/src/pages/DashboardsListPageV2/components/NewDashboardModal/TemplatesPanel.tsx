import { useState } from 'react';
import { generatePath } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { toast } from '@signozhq/ui/sonner';
import { ExternalLink, LoaderCircle } from '@signozhq/icons';
import { AxiosError } from 'axios';
import cx from 'classnames';
import logEvent from 'api/common/logEvent';
import { createDashboardV2 } from 'api/generated/services/dashboard';
import ROUTES from 'constants/routes';
import { RequestDashboardBtn } from 'container/ListOfDashboard/RequestDashboardBtn';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { openInNewTab } from 'utils/navigation';

import { normalizeToPostable } from './importUtils';
import JsonEditor from './JsonEditor';
import { useDashboardTemplates } from './templatesData';

import styles from './NewDashboardModal.module.scss';

// Browse the template gallery (mock data until the API lands): pick one on the
// left to preview its JSON on the right, then use it or open the docs.
function TemplatesPanel(): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { showErrorModal } = useErrorModal();
	const { data, isLoading } = useDashboardTemplates(true);
	const templates = data ?? [];

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);

	const selected = templates.find((t) => t.id === selectedId) ?? templates[0];

	const handleUse = async (): Promise<void> => {
		if (!selected) {
			return;
		}
		try {
			setCreating(true);
			logEvent('Dashboard List: Use template clicked', { template: selected.id });
			const parsed = JSON.parse(selected.json) as Record<string, unknown>;
			const created = await createDashboardV2(normalizeToPostable(parsed));
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: created.data.id }),
			);
		} catch (e) {
			showErrorModal(e as APIError);
			toast.error(
				(e as AxiosError).toString() || 'Failed to create from template',
			);
			setCreating(false);
		}
	};

	if (isLoading) {
		return (
			<div className={styles.panel}>
				<div className={styles.loading}>
					<LoaderCircle size={18} className={styles.spinner} />
					<span>Loading templates…</span>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.panel}>
			<div className={styles.templatesLayout}>
				<div className={styles.templatesList}>
					{templates.map((template) => (
						<button
							key={template.id}
							type="button"
							className={cx(styles.templateItem, {
								[styles.templateItemActive]: selected?.id === template.id,
							})}
							data-testid={`template-${template.id}`}
							onClick={(): void => setSelectedId(template.id)}
						>
							<span className={styles.templateName}>{template.name}</span>
							<span className={styles.templateCat}>{template.category}</span>
						</button>
					))}
				</div>

				{selected && (
					<div className={styles.templatesPreview}>
						<div className={styles.previewHead}>
							<div>
								<Typography.Text className={styles.cardName}>
									{selected.name}
								</Typography.Text>
								<Typography.Text className={styles.cardDesc}>
									{selected.description}
								</Typography.Text>
							</div>
							<Button
								variant="ghost"
								color="secondary"
								size="sm"
								suffix={<ExternalLink size={13} />}
								onClick={(): void => openInNewTab(selected.href)}
								testId="template-docs"
							>
								Docs
							</Button>
						</div>

						<JsonEditor value={selected.json} readOnly height="240px" />

						<div className={styles.footer}>
							<Button
								variant="solid"
								color="primary"
								size="md"
								loading={creating}
								testId="use-template"
								onClick={(): void => {
									void handleUse();
								}}
							>
								Use template
							</Button>
						</div>
					</div>
				)}
			</div>

			<div className={styles.requestRow}>
				<RequestDashboardBtn />
			</div>
		</div>
	);
}

export default TemplatesPanel;
