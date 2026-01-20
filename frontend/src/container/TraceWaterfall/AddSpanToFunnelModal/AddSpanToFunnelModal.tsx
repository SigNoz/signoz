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
import { isEqual } from 'lodash-es';
import { ArrowLeft, Check, Plus, Search } from 'lucide-react';
import FunnelConfiguration from 'pages/TracesFunnelDetails/components/FunnelConfiguration/FunnelConfiguration';
import { TracesFunnelsContentRenderer } from 'pages/TracesFunnels';
import CreateFunnel from 'pages/TracesFunnels/components/CreateFunnel/CreateFunnel';
import { FunnelListItem } from 'pages/TracesFunnels/components/FunnelsList/FunnelsList';
import {
	FunnelProvider,
	useFunnelContext,
} from 'pages/TracesFunnels/FunnelContext';
import { filterFunnelsByQuery } from 'pages/TracesFunnels/utils';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { FunnelData } from 'types/api/traceFunnels';

enum ModalView {
	LIST = 'list',
	DETAILS = 'details',
}

function FunnelDetailsView({
	funnel,
	span,
	triggerAutoSave,
	showNotifications,
	onChangesDetected,
	triggerDiscard,
}: {
	funnel: FunnelData;
	span: Span;
	triggerAutoSave: boolean;
	showNotifications: boolean;
	onChangesDetected: (hasChanges: boolean) => void;
	triggerDiscard: boolean;
}): JSX.Element {
	const { handleRestoreSteps, steps } = useFunnelContext();

	// Track changes between current steps and original steps
	useEffect(() => {
		const hasChanges = !isEqual(steps, funnel.steps);
		if (onChangesDetected) {
			onChangesDetected(hasChanges);
		}
	}, [steps, funnel.steps, onChangesDetected]);

	// Handle discard when triggered from parent
	useEffect(() => {
		if (triggerDiscard && funnel.steps) {
			handleRestoreSteps(funnel.steps);
		}
	}, [triggerDiscard, funnel.steps, handleRestoreSteps]);

	return (
		<div className="add-span-to-funnel-modal__details">
			<FunnelListItem
				funnel={funnel}
				shouldRedirectToTracesListOnDeleteSuccess={false}
				isSpanDetailsPage
			/>
			<FunnelConfiguration
				funnel={funnel}
				isTraceDetailsPage
				span={span}
				triggerAutoSave={triggerAutoSave}
				showNotifications={showNotifications}
			/>
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
	const [triggerSave, setTriggerSave] = useState<boolean>(false);
	const [isUnsavedChanges, setIsUnsavedChanges] = useState<boolean>(false);
	const [triggerDiscard, setTriggerDiscard] = useState<boolean>(false);
	const [isCreatedFromSpan, setIsCreatedFromSpan] = useState<boolean>(false);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchQuery(e.target.value);
	};

	const { data, isLoading, isError, isFetching } = useFunnelsList();

	const filteredData = useMemo(
		() =>
			filterFunnelsByQuery(data?.payload || [], searchQuery).sort(
				(a, b) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
		setSelectedFunnelId(funnel.funnel_id);
		setActiveView(ModalView.DETAILS);
		setIsCreatedFromSpan(false);
	};

	const handleBack = (): void => {
		setActiveView(ModalView.LIST);
		setSelectedFunnelId(undefined);
		setIsUnsavedChanges(false);
		setTriggerSave(false);
		setIsCreatedFromSpan(false);
	};

	const handleCreateNewClick = (): void => {
		setIsCreateModalOpen(true);
	};

	const handleSaveFunnel = (): void => {
		setTriggerSave(true);
		// Reset trigger after a brief moment to allow the save to be processed
		setTimeout(() => {
			setTriggerSave(false);
			onClose();
		}, 100);
	};

	const handleDiscard = (): void => {
		setTriggerDiscard(true);
		// Reset trigger after a brief moment
		setTimeout(() => {
			setTriggerDiscard(false);
			onClose();
		}, 100);
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
						setIsCreatedFromSpan(true);
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
			<div className="traces-funnel-details">
				<div className="traces-funnel-details__steps-config">
					<Spin
						className="add-span-to-funnel-modal__loading-spinner"
						spinning={isFunnelDetailsLoading || isFunnelDetailsFetching}
						indicator={<LoadingOutlined spin />}
					>
						{selectedFunnelId && funnelDetails?.payload && (
							<FunnelProvider
								funnelId={selectedFunnelId}
								hasSingleStep={isCreatedFromSpan}
							>
								<FunnelDetailsView
									funnel={funnelDetails.payload}
									span={span}
									triggerAutoSave={triggerSave}
									showNotifications
									onChangesDetected={setIsUnsavedChanges}
									triggerDiscard={triggerDiscard}
								/>
							</FunnelProvider>
						)}
					</Spin>
				</div>
			</div>
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
			footer={
				activeView === ModalView.DETAILS
					? [
							<Button
								type="default"
								key="discard"
								onClick={handleDiscard}
								className="add-span-to-funnel-modal__discard-button"
								disabled={!isUnsavedChanges}
							>
								Discard
							</Button>,
							<Button
								key="save"
								type="primary"
								className="add-span-to-funnel-modal__save-button"
								onClick={handleSaveFunnel}
								disabled={!isUnsavedChanges}
								icon={<Check size={14} color="var(--bg-vanilla-100)" />}
							>
								Save Funnel
							</Button>,
					  ]
					: [
							<Button
								key="create"
								type="default"
								className="add-span-to-funnel-modal__create-button"
								onClick={handleCreateNewClick}
								icon={<Plus size={14} />}
							>
								Create new funnel
							</Button>,
					  ]
			}
		>
			{activeView === ModalView.LIST
				? renderListView()
				: renderDetailsView({ span })}
		</SignozModal>
	);
}

export default AddSpanToFunnelModal;
