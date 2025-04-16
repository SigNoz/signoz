import './AddSpanToFunnelModal.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import cx from 'classnames';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import SignozModal from 'components/SignozModal/SignozModal';
import {
	useFunnelDetails,
	useFunnelsList,
} from 'hooks/TracesFunnels/useFunnels';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import FunnelConfiguration from 'pages/TracesFunnelDetails/components/FunnelConfiguration/FunnelConfiguration';
import { TracesFunnelsContentRenderer } from 'pages/TracesFunnels';
import CreateFunnel from 'pages/TracesFunnels/components/CreateFunnel/CreateFunnel';
import { FunnelListItem } from 'pages/TracesFunnels/components/FunnelsList/FunnelsList';
import { FunnelProvider } from 'pages/TracesFunnels/FunnelContext';
import { ChangeEvent, useMemo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { FunnelData } from 'types/api/traceFunnels';

enum ModalView {
	LIST = 'list',
	DETAILS = 'details',
}

function FunnelDetailsView({
	funnel,
	span,
}: {
	funnel: FunnelData;
	span: Span;
}): JSX.Element {
	return (
		<div className="add-span-to-funnel-modal__details">
			<FunnelListItem
				funnel={funnel}
				shouldRedirectToTracesListOnDeleteSuccess={false}
			/>
			<FunnelConfiguration funnel={funnel} isTraceDetailsPage span={span} />
		</div>
	);
}
interface AddSpanToFunnelModalProps {
	isOpen: boolean;
	onClose: () => void;
	span: Span;
}

function AddSpanToFunnelModal({
	isOpen,
	onClose,
	span,
}: AddSpanToFunnelModalProps): JSX.Element {
	const [activeView, setActiveView] = useState<ModalView>(ModalView.LIST);
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [selectedFunnelId, setSelectedFunnelId] = useState<string | undefined>(
		undefined,
	);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchQuery(e.target.value);
	};

	const { data, isLoading, isError, isFetching } = useFunnelsList({
		searchQuery: '',
	});

	const filteredData = useMemo(
		() =>
			data?.payload
				?.filter((funnel) =>
					funnel.funnel_name.toLowerCase().includes(searchQuery.toLowerCase()),
				)
				.sort(
					(a, b) =>
						new Date(b.creation_timestamp).getTime() -
						new Date(a.creation_timestamp).getTime(),
				),
		[data?.payload, searchQuery],
	);

	const {
		data: funnelDetails,
		isLoading: isFunnelDetailsLoading,
		isFetching: isFunnelDetailsFetching,
	} = useFunnelDetails({
		funnelId: selectedFunnelId,
	});

	const handleFunnelClick = (funnel: FunnelData): void => {
		setSelectedFunnelId(funnel.id);
		setActiveView(ModalView.DETAILS);
	};

	const handleBack = (): void => {
		setActiveView(ModalView.LIST);
		setSelectedFunnelId(undefined);
	};

	const handleCreateNewClick = (): void => {
		setIsCreateModalOpen(true);
	};

	const renderListView = (): JSX.Element => (
		<div className="add-span-to-funnel-modal">
			{!!filteredData?.length && (
				<div className="add-span-to-funnel-modal__search">
					<Input
						className="add-span-to-funnel-modal__search-input"
						placeholder="Search by name, description, or tags..."
						prefix={<Search size={12} />}
						value={searchQuery}
						onChange={handleSearch}
					/>
				</div>
			)}
			<div className="add-span-to-funnel-modal__list">
				<OverlayScrollbar>
					<TracesFunnelsContentRenderer
						isError={isError}
						isLoading={isLoading || isFetching}
						data={filteredData || []}
						onCreateFunnel={handleCreateNewClick}
						onFunnelClick={(funnel: FunnelData): void => handleFunnelClick(funnel)}
						shouldRedirectToTracesListOnDeleteSuccess={false}
					/>
				</OverlayScrollbar>
			</div>
			<CreateFunnel
				isOpen={isCreateModalOpen}
				onClose={(funnelId): void => {
					if (funnelId) {
						setSelectedFunnelId(funnelId);
						setActiveView(ModalView.DETAILS);
					}
					setIsCreateModalOpen(false);
				}}
				redirectToDetails={false}
			/>
		</div>
	);

	const renderDetailsView = ({ span }: { span: Span }): JSX.Element => (
		<div className="add-span-to-funnel-modal add-span-to-funnel-modal--details">
			<Button
				type="text"
				className="add-span-to-funnel-modal__back-button"
				onClick={handleBack}
			>
				<ArrowLeft size={14} />
				All funnels
			</Button>
			<Spin
				style={{ height: 400 }}
				spinning={isFunnelDetailsLoading || isFunnelDetailsFetching}
				indicator={<LoadingOutlined spin />}
			>
				<div className="traces-funnel-details">
					<div className="traces-funnel-details__steps-config">
						{selectedFunnelId && funnelDetails?.payload && (
							<FunnelProvider funnelId={selectedFunnelId}>
								<FunnelDetailsView funnel={funnelDetails.payload} span={span} />
							</FunnelProvider>
						)}
					</div>
				</div>
			</Spin>
		</div>
	);

	return (
		<SignozModal
			open={isOpen}
			onCancel={onClose}
			width={570}
			title="Add span to funnel"
			className={cx('add-span-to-funnel-modal-container', {
				'add-span-to-funnel-modal-container--details':
					activeView === ModalView.DETAILS,
			})}
			okText="Save Funnel"
			footer={
				activeView === ModalView.LIST && !!filteredData?.length ? (
					<Button
						type="default"
						className="add-span-to-funnel-modal__create-button"
						onClick={handleCreateNewClick}
						icon={<Plus size={14} />}
					>
						Create new funnel
					</Button>
				) : null
			}
		>
			{activeView === ModalView.LIST
				? renderListView()
				: renderDetailsView({ span })}
		</SignozModal>
	);
}

export default AddSpanToFunnelModal;
