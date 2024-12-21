/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './MessagingQueueHealthCheck.styles.scss';

import { CaretDownOutlined, LoadingOutlined } from '@ant-design/icons';
import {
	Modal,
	Select,
	Spin,
	Tooltip,
	Tree,
	TreeDataNode,
	Typography,
} from 'antd';
import { OnboardingStatusResponse } from 'api/messagingQueues/onboarding/getOnboardingStatus';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { History } from 'history';
import { Bolt, Check, OctagonAlert, X } from 'lucide-react';
import {
	KAFKA_SETUP_DOC_LINK,
	MessagingQueueHealthCheckService,
} from 'pages/MessagingQueues/MessagingQueuesUtils';
import { ReactNode, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { isCloudUser } from 'utils/app';
import { v4 as uuid } from 'uuid';

interface AttributeCheckListProps {
	visible: boolean;
	onClose: () => void;
	onboardingStatusResponses: {
		title: string;
		data: OnboardingStatusResponse['data'];
		errorMsg?: string;
	}[];
	loading: boolean;
}

export enum AttributesFilters {
	ALL = 'all',
	SUCCESS = 'success',
	ERROR = 'error',
}

function ErrorTitleAndKey({
	title,
	parentTitle,
	history,
	isCloudUserVal,
	errorMsg,
	isLeaf,
}: {
	title: string;
	parentTitle: string;
	isCloudUserVal: boolean;
	history: History<unknown>;
	errorMsg?: string;
	isLeaf?: boolean;
}): TreeDataNode {
	const handleRedirection = (): void => {
		let link = '';

		switch (parentTitle) {
			case 'Consumers':
				link = `${ROUTES.GET_STARTED_APPLICATION_MONITORING}?${QueryParams.getStartedSource}=kafka&${QueryParams.getStartedSourceService}=${MessagingQueueHealthCheckService.Consumers}`;
				break;
			case 'Producers':
				link = `${ROUTES.GET_STARTED_APPLICATION_MONITORING}?${QueryParams.getStartedSource}=kafka&${QueryParams.getStartedSourceService}=${MessagingQueueHealthCheckService.Producers}`;
				break;
			case 'Kafka':
				link = `${ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING}?${QueryParams.getStartedSource}=kafka&${QueryParams.getStartedSourceService}=${MessagingQueueHealthCheckService.Kafka}`;
				break;
			default:
				link = '';
		}

		if (isCloudUserVal && !!link) {
			history.push(link);
		} else {
			window.open(KAFKA_SETUP_DOC_LINK, '_blank');
		}
	};
	return {
		key: `${title}-key-${uuid()}`,
		title: (
			<div className="attribute-error-title">
				<Typography.Text className="tree-text" ellipsis={{ tooltip: title }}>
					{title}
				</Typography.Text>
				<Tooltip title={errorMsg}>
					<div
						className="attribute-error-warning"
						onClick={(e): void => {
							e.preventDefault();
							handleRedirection();
						}}
					>
						<OctagonAlert size={14} />
						Fix
					</div>
				</Tooltip>
			</div>
		),
		isLeaf,
	};
}

function AttributeLabels({ title }: { title: ReactNode }): JSX.Element {
	return (
		<div className="attribute-label">
			<Bolt size={14} />
			{title}
		</div>
	);
}

function treeTitleAndKey({
	title,
	isLeaf,
}: {
	title: string;
	isLeaf?: boolean;
}): TreeDataNode {
	return {
		key: `${title}-key-${uuid()}`,
		title: (
			<div className="attribute-success-title">
				<Typography.Text className="tree-text" ellipsis={{ tooltip: title }}>
					{title}
				</Typography.Text>
				{isLeaf && (
					<div className="success-attribute-icon">
						<Tooltip title="Success">
							<Check size={14} />
						</Tooltip>
					</div>
				)}
			</div>
		),
		isLeaf,
	};
}

function generateTreeDataNodes(
	response: OnboardingStatusResponse['data'],
	parentTitle: string,
	isCloudUserVal: boolean,
	history: History<unknown>,
): TreeDataNode[] {
	return response
		.map((item) => {
			if (item.attribute) {
				if (item.status === '1') {
					return treeTitleAndKey({ title: item.attribute, isLeaf: true });
				}
				if (item.status === '0') {
					return ErrorTitleAndKey({
						title: item.attribute,
						errorMsg: item.error_message || '',
						parentTitle,
						history,
						isCloudUserVal,
					});
				}
			}
			return null;
		})
		.filter(Boolean) as TreeDataNode[];
}

function AttributeCheckList({
	visible,
	onClose,
	onboardingStatusResponses,
	loading,
}: AttributeCheckListProps): JSX.Element {
	const [filter, setFilter] = useState<AttributesFilters>(AttributesFilters.ALL);
	const [treeData, setTreeData] = useState<TreeDataNode[]>([]);

	const handleFilterChange = (value: AttributesFilters): void => {
		setFilter(value);
	};
	const isCloudUserVal = isCloudUser();
	const history = useHistory();

	useEffect(() => {
		const filteredData = onboardingStatusResponses.map((response) => {
			if (response.errorMsg) {
				return ErrorTitleAndKey({
					title: response.title,
					errorMsg: response.errorMsg,
					isLeaf: true,
					parentTitle: response.title,
					history,
					isCloudUserVal,
				});
			}
			let filteredData = response.data;

			if (filter === AttributesFilters.SUCCESS) {
				filteredData = response.data.filter((item) => item.status === '1');
			} else if (filter === AttributesFilters.ERROR) {
				filteredData = response.data.filter((item) => item.status === '0');
			}

			return {
				...treeTitleAndKey({ title: response.title }),
				children: generateTreeDataNodes(
					filteredData,
					response.title,
					isCloudUserVal,
					history,
				),
			};
		});

		setTreeData(filteredData);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filter, onboardingStatusResponses]);

	return (
		<Modal
			title="Kafka Service Attributes"
			open={visible}
			onCancel={onClose}
			footer={false}
			className="mq-health-check-modal"
			closeIcon={<X size={14} />}
		>
			{loading ? (
				<div className="loader-container">
					<Spin indicator={<LoadingOutlined spin />} size="large" />
				</div>
			) : (
				<div className="modal-content">
					<Select
						defaultValue={AttributesFilters.ALL}
						className="attribute-select"
						onChange={handleFilterChange}
						options={[
							{
								value: AttributesFilters.ALL,
								label: AttributeLabels({ title: 'Attributes: All' }),
							},
							{
								value: AttributesFilters.SUCCESS,
								label: AttributeLabels({ title: 'Attributes: Success' }),
							},
							{
								value: AttributesFilters.ERROR,
								label: AttributeLabels({ title: 'Attributes: Error' }),
							},
						]}
					/>
					<Tree
						showLine
						switcherIcon={<CaretDownOutlined />}
						treeData={treeData}
						height={450}
						className="attribute-tree"
					/>
				</div>
			)}
		</Modal>
	);
}

export default AttributeCheckList;
