/* eslint-disable sonarjs/cognitive-complexity */
// import './LogDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import {
	Button,
	DatePicker,
	Divider,
	Drawer,
	Form,
	Input,
	Radio,
	Select,
	Tooltip,
	Typography,
} from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import cx from 'classnames';
import { LogType } from 'components/Logs/LogStateIndicator/LogStateIndicator';
import ContextView from 'container/LogDetailedView/ContextView/ContextView';
import JSONView from 'container/LogDetailedView/JsonView';
import Overview from 'container/LogDetailedView/Overview';
import { aggregateAttributesResourcesToString } from 'container/LogDetailedView/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import {
	BarChart2,
	Braces,
	Check,
	Copy,
	DraftingCompass,
	Filter,
	HardHat,
	ScrollText,
	Table,
	TextSelect,
	X,
} from 'lucide-react';
import { useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { IngestionKeyProps } from 'types/api/ingestionKeys/types';
import { API_KEY_EXPIRY_OPTIONS, disabledDate } from './IngestionSettings';
import Tags from 'components/Tags/Tags';
import { InfoCircleFilled } from '@ant-design/icons';
import Tabs from 'periscope/components/Tabs';
import { TabProps } from 'periscope/components/Tabs/Tabs';
import Limits from './Limits/Limits';
import dayjs from 'dayjs';

interface IngestionKeyDetailsProps {
	openDrawer: boolean;
	onClose: () => void;
	data: IngestionKeyProps;
	updatedTags: string[];
	onUpdatedTags: (tags: string[]) => void;
	handleCopyKey: (key: string) => void;
	onUpdateIngestionKeyDetails: (data: Record<string, unknown>) => void;
}

function IngestionKeyDetails({
	openDrawer,
	onClose,
	data,
	updatedTags,
	onUpdatedTags,
	handleCopyKey,
	onUpdateIngestionKeyDetails,
}: IngestionKeyDetailsProps): JSX.Element {
	const [, copyToClipboard] = useCopyToClipboard();
	const [editForm] = Form.useForm();
	const isDarkMode = useIsDarkMode();
	const [first, setfirst] = useState();

	const drawerCloseHandler = (
		e: React.MouseEvent | React.KeyboardEvent,
	): void => {
		if (onClose) {
			onClose();
		}
	};

	const handleLimitUpdate = (id, values) => {};

	const tabItems: TabProps[] = [
		{
			label: (
				<div className="tab-name">
					<ScrollText size={12} /> Logs
				</div>
			),
			key: 'logs',
			children: <Limits id="logs" onLimitUpdate={handleLimitUpdate} />,
		},
		{
			label: (
				<div className="tab-name">
					<BarChart2 size={12} /> Metrics
				</div>
			),
			key: 'metrics',
			children: <Limits id="metrics" onLimitUpdate={handleLimitUpdate} />,
		},
		{
			label: (
				<div className="tab-name">
					<DraftingCompass size={12} /> Traces
				</div>
			),
			key: 'traces',
			children: <Limits id="traces" onLimitUpdate={handleLimitUpdate} />,
		},
	];

	const handleUpdate = () => {
		editForm
			.validateFields()
			.then((values) => {
				onUpdateIngestionKeyDetails({ ...values, tags: updatedTags });
			})
			.catch((errorInfo) => {
				console.error('error info', errorInfo);
			});
	};

	return (
		<Drawer
			width="45%"
			title={
				<div className="ingestion-key-details-edit-drawer-title">
					<Typography.Text className="title">{data?.name}</Typography.Text>
					<div className="ingestion-key-value copyable-text">
						<Typography.Text>
							{data?.value.substring(0, 2)}********
							{data?.value.substring(data.value.length - 2).trim()}
						</Typography.Text>

						<Copy
							className="copy-key-btn"
							size={12}
							onClick={(e): void => {
								e.stopPropagation();
								e.preventDefault();
								handleCopyKey(data.value);
							}}
						/>
					</div>
				</div>
			}
			placement="right"
			open={openDrawer}
			onClose={drawerCloseHandler}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="ingestion-details-edit-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
			footer={
				<div className="save-discard-changes">
					<Button
						key="cancel"
						onClick={drawerCloseHandler}
						className="periscope-btn cancel-btn"
						icon={<X size={16} />}
					>
						Cancel
					</Button>

					<Button
						className="periscope-btn primary"
						key="submit"
						type="primary"
						icon={<Check size={14} />}
						onClick={handleUpdate}
					>
						Update Ingestion Key
					</Button>
				</div>
			}
		>
			<div className="ingestion-key-details-meta">
				<Form
					name="edit-ingestion-key-form"
					key={data?.id}
					form={editForm}
					layout="vertical"
					autoComplete="off"
					initialValues={{
						name: data?.name,
						expires_at: dayjs(data?.expires_at),
					}}
				>
					<Form.Item
						name="expires_at"
						label="Expiration"
						rules={[{ required: true }]}
					>
						<DatePicker
							popupClassName="ingestion-key-expires-at"
							disabledDate={disabledDate}
						/>
					</Form.Item>

					<Form.Item name="tags" label="Tags">
						<Tags tags={updatedTags} setTags={onUpdatedTags} />
					</Form.Item>
				</Form>

				<div className="alert">
					<div className="icon">
						<InfoCircleFilled size={12} />
					</div>

					<div className="content">
						You can set limits for both data points and memory used. Data Ingestion
						would be limited based on which limit is hit first.
					</div>
				</div>

				<div className="ingestion-key-limits">
					<Tabs items={tabItems} />
				</div>
			</div>
		</Drawer>
	);
}

export default IngestionKeyDetails;
