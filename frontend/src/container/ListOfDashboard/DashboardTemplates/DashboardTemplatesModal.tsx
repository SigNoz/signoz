/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import './DashboardTemplatesModal.styles.scss';

import { Button, Input, Modal, Typography } from 'antd';
import ApacheIcon from 'assets/CustomIcons/ApacheIcon';
import DockerIcon from 'assets/CustomIcons/DockerIcon';
import ElasticSearchIcon from 'assets/CustomIcons/ElasticSearchIcon';
import HerokuIcon from 'assets/CustomIcons/HerokuIcon';
import KubernetesIcon from 'assets/CustomIcons/KubernetesIcon';
import MongoDBIcon from 'assets/CustomIcons/MongoDBIcon';
import MySQLIcon from 'assets/CustomIcons/MySQLIcon';
import NginxIcon from 'assets/CustomIcons/NginxIcon';
import PostgreSQLIcon from 'assets/CustomIcons/PostgreSQLIcon';
import RedisIcon from 'assets/CustomIcons/RedisIcon';
import cx from 'classnames';
import { ConciergeBell, DraftingCompass, Drill, Plus, X } from 'lucide-react';
import { ChangeEvent, useState } from 'react';
import { DashboardTemplate } from 'types/api/dashboard/getAll';

import { filterTemplates } from '../utils';

const templatesList: DashboardTemplate[] = [
	{
		name: 'Blank dashboard',
		icon: <Drill />,
		id: 'blank',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'Alert Manager',
		icon: <ConciergeBell />,
		id: 'alertManager',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'Apache',
		icon: <ApacheIcon />,
		id: 'apache',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'Docker',
		icon: <DockerIcon />,
		id: 'docker',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'Elasticsearch',
		icon: <ElasticSearchIcon />,
		id: 'elasticSearch',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'MongoDB',
		icon: <MongoDBIcon />,
		id: 'mongoDB',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'Heroku',
		icon: <HerokuIcon />,
		id: 'heroku',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'Nginx',
		icon: <NginxIcon />,
		id: 'nginx',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'Kubernetes',
		icon: <KubernetesIcon />,
		id: 'kubernetes',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'MySQL',
		icon: <MySQLIcon />,
		id: 'mySQL',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'PostgreSQL',
		icon: <PostgreSQLIcon />,
		id: 'postgreSQL',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
	{
		name: 'Redis',
		icon: <RedisIcon />,
		id: 'redis',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/redisTemplatePreview.svg',
	},
	{
		name: 'AWS',
		icon: <DraftingCompass size={14} />,
		id: 'aws',
		description: 'Create a custom dashboard from scratch.',
		previewImage: '/Images/blankDashboardTemplatePreview.svg',
	},
];

interface DashboardTemplatesModalProps {
	showNewDashboardTemplatesModal: boolean;
	onCreateNewDashboard: () => void;
	onCancel: () => void;
}

export default function DashboardTemplatesModal({
	showNewDashboardTemplatesModal,
	onCreateNewDashboard,
	onCancel,
}: DashboardTemplatesModalProps): JSX.Element {
	const [selectedDashboardTemplate, setSelectedDashboardTemplate] = useState(
		templatesList[0],
	);

	const [dashboardTemplates, setDashboardTemplates] = useState(templatesList);

	const handleDashboardTemplateSearch = (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const searchText = event.target.value;
		const filteredTemplates = filterTemplates(searchText, templatesList);
		setDashboardTemplates(filteredTemplates);
	};

	return (
		<Modal
			wrapClassName="new-dashboard-templates-modal"
			open={showNewDashboardTemplatesModal}
			centered
			closable={false}
			footer={null}
			destroyOnClose
			width="60vw"
		>
			<div className="new-dashboard-templates-content-container">
				<div className="new-dashboard-templates-content-header">
					<Typography.Text>New Dashboard</Typography.Text>

					<X size={14} className="periscope-btn ghost" onClick={onCancel} />
				</div>

				<div className="new-dashboard-templates-content">
					<div className="new-dashboard-templates-list">
						<Input
							className="new-dashboard-templates-search"
							placeholder="🔍 Search..."
							onChange={handleDashboardTemplateSearch}
						/>

						<div className="templates-list">
							{dashboardTemplates.map((template) => (
								<div
									className={cx(
										'template-list-item',
										selectedDashboardTemplate.id === template.id ? 'active' : '',
									)}
									key={template.name}
									onClick={() => setSelectedDashboardTemplate(template)}
								>
									<div className="template-icon">{template.icon}</div>
									<div className="template-name">{template.name}</div>
								</div>
							))}
						</div>
					</div>

					<div className="new-dashboard-template-preview">
						<div className="template-preview-header">
							<div className="template-preview-title">
								<div className="template-preview-icon">
									{selectedDashboardTemplate.icon}
								</div>

								<div className="template-info">
									<div className="template-name">{selectedDashboardTemplate.name}</div>

									<div className="template-description">
										{selectedDashboardTemplate.description}
									</div>
								</div>
							</div>

							<div className="create-dashboard-btn">
								<Button
									type="primary"
									className="periscope-btn primary"
									icon={<Plus size={14} />}
									onClick={onCreateNewDashboard}
								>
									New dashboard
								</Button>
							</div>
						</div>

						<div className="template-preview-image">
							<img
								src={selectedDashboardTemplate.previewImage}
								alt={`${selectedDashboardTemplate.name}-preview`}
							/>
						</div>
					</div>
				</div>
			</div>
		</Modal>
	);
}
