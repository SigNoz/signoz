import './LogDetails.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Input, Radio, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import JSONView from 'container/LogDetailedView/JsonView';
import Overview from 'container/LogDetailedView/Overview';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	Braces,
	ChevronDown,
	ChevronUp,
	Search,
	Table,
	TextSelect,
	X,
} from 'lucide-react';
import { useState } from 'react';

import { VIEW_TYPES, VIEWS } from './constants';
import { LogDetailProps } from './LogDetail.interfaces';

function LogDetail({
	log,
	onClose,
	onAddToQuery,
	onClickActionItem,
}: LogDetailProps): JSX.Element {
	console.log({ onClickActionItem }); // TODO: remove, ketp for linter error
	const [selectedView, setSelectedView] = useState<VIEWS>(VIEW_TYPES.OVERVIEW);
	const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');
	const isDarkMode = useIsDarkMode();

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
							border: isDarkMode ? undefined : `1px solid ${Color.BG_VANILLA_400}`,
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
			closeIcon={<X />}
			extra={
				<>
					<Radio.Button className="radio-button">
						<ChevronUp size={16} />
					</Radio.Button>
					<Radio.Button className="radio-button">
						<ChevronDown size={16} />
					</Radio.Button>
				</>
			}
		>
			<div className="log-detail-drawer__log">
				<Divider
					type="vertical"
					style={{
						fontSize: '20px',
						border: isDarkMode ? undefined : `1px solid ${Color.BG_VANILLA_400}`,
					}}
				/>
				<Typography.Text className="log-body">{log?.body}</Typography.Text>
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
						className={selectedView === 'CONTENT' ? 'selected_view tab' : 'tab'}
						value={VIEW_TYPES.CONTENT}
					>
						<div className="view-title">
							<TextSelect size={14} />
							Content
						</div>
					</Radio.Button>
				</Radio.Group>

				<Button
					className="btn-search"
					icon={<Search size={14} />}
					onClick={handleSearchVisible}
				/>
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
		</Drawer>
	);
}

export default LogDetail;
