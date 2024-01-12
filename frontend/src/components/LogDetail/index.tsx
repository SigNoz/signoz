import './LogDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import {
	Button,
	Divider,
	Drawer,
	Input,
	Radio,
	Tooltip,
	Typography,
} from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import JSONView from 'container/LogDetailedView/JsonView';
import LogContext from 'container/LogDetailedView/LogContext';
import Overview from 'container/LogDetailedView/Overview';
import { aggregateAttributesResourcesToString } from 'container/LogDetailedView/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import {
	Braces,
	ChevronDown,
	ChevronUp,
	Compass,
	Copy,
	Filter,
	Search,
	Table,
	TextSelect,
	X,
} from 'lucide-react';
import { useState } from 'react';
import { useCopyToClipboard } from 'react-use';

import { VIEW_TYPES, VIEWS } from './constants';
import { LogDetailProps } from './LogDetail.interfaces';

function LogDetail({
	log,
	onClose,
	onAddToQuery,
	onClickActionItem,
	selectedTab,
}: LogDetailProps): JSX.Element {
	console.log({ onClickActionItem }); // TODO: remove, ketp for linter error
	const [, copyToClipboard] = useCopyToClipboard();
	const [selectedView, setSelectedView] = useState<VIEWS>(selectedTab);
	const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');
	const isDarkMode = useIsDarkMode();

	const { notifications } = useNotifications();

	const LogJsonData = log ? aggregateAttributesResourcesToString(log) : '';

	const handleModeChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

	const handleSearchVisible = (): void => {
		setIsSearchVisible(!isSearchVisible);
	};

	const drawerCloseHandler = (
		e: React.MouseEvent | React.KeyboardEvent,
	): void => {
		setFieldSearchInput('');
		setIsSearchVisible(false);
		if (onClose) {
			onClose(e);
		}
	};

	const handleJSONCopy = (): void => {
		copyToClipboard(LogJsonData);
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	if (!log) {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}

	return (
		<Drawer
			width="60%"
			title={
				<>
					<Divider
						type="vertical"
						style={{
							border: isDarkMode
								? `1px solid ${Color.BG_SLATE_500}`
								: `1px solid ${Color.BG_VANILLA_400}`,
						}}
					/>
					<Typography.Text className="title">Log details</Typography.Text>
				</>
			}
			placement="right"
			closable
			onClose={drawerCloseHandler}
			open={log !== null}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="log-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
			extra={
				<Button.Group>
					<Button className="radio-button" icon={<ChevronUp size={16} />} />
					<Button className="radio-button" icon={<ChevronDown size={16} />} />
				</Button.Group>
			}
		>
			<div className="log-detail-drawer__log">
				<Divider
					type="vertical"
					style={{
						fontSize: '20px',
						border: isDarkMode
							? `2px solid ${Color.BG_SLATE_400}`
							: `2px solid ${Color.BG_VANILLA_400}`,
					}}
				/>
				<Tooltip title={log?.body}>
					<Typography.Text className="log-body">{log?.body}</Typography.Text>
				</Tooltip>
			</div>

			<div className="tabs-and-search">
				<Radio.Group
					className="views-tabs"
					onChange={handleModeChange}
					value={selectedView}
				>
					<Radio.Button
						className={
							// eslint-disable-next-line sonarjs/no-duplicate-string
							selectedView === 'OVERVIEW' ? 'selected_view tabs' : 'tab'
						}
						value={VIEW_TYPES.OVERVIEW}
					>
						<div className="view-title">
							<Table size={14} />
							Overview
						</div>
					</Radio.Button>
					<Radio.Button
						className={selectedView === 'JSON' ? 'selected_view tabs' : 'tab'}
						value={VIEW_TYPES.JSON}
					>
						<div className="view-title">
							<Braces size={14} />
							JSON
						</div>
					</Radio.Button>
					<Radio.Button
						className={selectedView === 'CONTEXT' ? 'selected_view tab' : 'tab'}
						value={VIEW_TYPES.CONTEXT}
					>
						<div className="view-title">
							<TextSelect size={14} />
							Context
						</div>
					</Radio.Button>
				</Radio.Group>

				{selectedView === 'OVERVIEW' && (
					<Button
						className="action-btn"
						icon={<Search size={14} />}
						onClick={handleSearchVisible}
					/>
				)}

				{selectedView === 'JSON' && (
					<div className="json-action-btn">
						<Button className="action-btn" icon={<Compass size={16} />} />
						<Button
							className="btn-search"
							icon={<Copy size={16} />}
							onClick={handleJSONCopy}
						/>
					</div>
				)}

				{selectedView === 'CONTEXT' && (
					<Button className="action-btn" icon={<Filter size={16} />} />
				)}
			</div>

			{isSearchVisible && (
				<Input
					placeholder="Search..."
					className="search-input"
					value={fieldSearchInput}
					onChange={(e): void => setFieldSearchInput(e.target.value)}
				/>
			)}

			{selectedView === VIEW_TYPES.OVERVIEW && (
				<Overview
					logData={log}
					onAddToQuery={onAddToQuery}
					fieldSearchInput={fieldSearchInput}
				/>
			)}
			{selectedView === VIEW_TYPES.JSON && <JSONView logData={log} />}

			{selectedView === VIEW_TYPES.CONTEXT && <LogContext log={log} />}
		</Drawer>
	);
}

export default LogDetail;
