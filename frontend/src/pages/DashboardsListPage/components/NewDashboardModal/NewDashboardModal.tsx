import { useEffect, useState } from 'react';
import { Dialog } from '@signozhq/ui/dialog';
import { Tabs } from '@signozhq/ui/tabs';
import logEvent from 'api/common/logEvent';
import { DashboardListEvents } from 'pages/DashboardsListPage/constants/events';

import BlankDashboardPanel from './BlankDashboardPanel';
import ImportJsonPanel from './ImportJsonPanel';
import TemplatesPanel from './TemplatesPanel';

import styles from './NewDashboardModal.module.scss';

interface Props {
	open: boolean;
	onClose: () => void;
}

function NewDashboardModal({ open, onClose }: Props): JSX.Element {
	const [tab, setTab] = useState('blank');

	useEffect(() => {
		if (open) {
			setTab('blank');
		}
	}, [open]);

	const handleTabChange = (key: string): void => {
		setTab(key);
		void logEvent(DashboardListEvents.CreateModalTabChanged, { tab: key });
	};

	return (
		<Dialog
			title="New dashboard"
			open={open}
			width="wide"
			onClose={(): void => onClose()}
		>
			<div className={styles.tabs}>
				<Tabs
					variant="primary"
					orientation="horizontal"
					alignment="start"
					value={tab}
					onChange={handleTabChange}
					items={[
						{
							key: 'blank',
							label: 'Blank',
							children: <BlankDashboardPanel onClose={onClose} />,
						},
						{
							key: 'template',
							label: 'From a template',
							children: <TemplatesPanel />,
						},
						{
							key: 'import',
							label: 'Import JSON',
							children: <ImportJsonPanel onClose={onClose} />,
						},
					]}
				/>
			</div>
		</Dialog>
	);
}

export default NewDashboardModal;
