import { useState } from 'react';
import { generatePath } from 'react-router-dom';
import { toast } from '@signozhq/ui/sonner';
import { AxiosError } from 'axios';
import logEvent from 'api/common/logEvent';
import { createDashboardV2 } from 'api/generated/services/dashboard';
import ROUTES from 'constants/routes';
import DashboardTemplatesContent from 'container/ListOfDashboard/DashboardTemplates/DashboardTemplatesContent';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import styles from './NewDashboardModal.module.scss';

interface Props {
	onClose: () => void;
}

// Until the templates BE API lands, the V2 "From a template" tab embeds the V1
// template gallery inline (no modal-in-modal). The V1 templates are placeholders,
// so the action creates a blank dashboard.
function TemplatesPanel({ onClose }: Props): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { showErrorModal } = useErrorModal();
	const [creating, setCreating] = useState(false);

	const handleCreate = async (): Promise<void> => {
		if (creating) {
			return;
		}
		try {
			setCreating(true);
			logEvent('Dashboard List: Use template clicked', {});
			const created = await createDashboardV2({
				schemaVersion: 'v6',
				generateName: true,
				tags: null,
				spec: {
					display: { name: 'Sample Dashboard' },
					layouts: [],
					panels: {},
					variables: [],
				},
			});
			onClose();
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: created.data.id }),
			);
		} catch (e) {
			showErrorModal(e as APIError);
			toast.error((e as AxiosError).toString() || 'Failed to create dashboard');
			setCreating(false);
		}
	};

	return (
		<div className={styles.panel}>
			<div className="new-dashboard-templates-modal">
				<DashboardTemplatesContent
					onCreateNewDashboard={(): void => {
						void handleCreate();
					}}
				/>
			</div>
		</div>
	);
}

export default TemplatesPanel;
