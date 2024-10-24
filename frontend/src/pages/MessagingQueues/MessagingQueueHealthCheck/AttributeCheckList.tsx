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
import { Bolt, Check, OctagonAlert, X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
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
	errorMsg,
	isLeaf,
}: {
	title: string;
	errorMsg?: string;
	isLeaf?: boolean;
}): TreeDataNode {
	return {
		key: `${title}-key-${uuid()}`,
		title: (
			<div className="attribute-error-title">
				<Typography.Text className="tree-text" ellipsis={{ tooltip: title }}>
					{title}
				</Typography.Text>
				<Tooltip title={errorMsg}>
					<div className="attribute-error-warning">
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

	useEffect(() => {
		const filteredData = onboardingStatusResponses.map((response) => {
			if (response.errorMsg) {
				return ErrorTitleAndKey({
					title: response.title,
					errorMsg: response.errorMsg,
					isLeaf: true,
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
				children: generateTreeDataNodes(filteredData),
			};
		});

		setTreeData(filteredData);
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
