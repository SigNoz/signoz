import { memo } from 'react';
import { Card, Modal } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES, PANEL_TYPES_INITIAL_QUERY } from 'constants/queryBuilder';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { usePanelTypeSelectionModalStore } from 'providers/Dashboard/helpers/panelTypeSelectionModalHelper';
import { v4 as uuid } from 'uuid';

import { PanelTypesWithData } from './menuItems';

import './PanelTypeSelectionModal.styles.scss';

function PanelTypeSelectionModal(): JSX.Element {
	const { isPanelTypeSelectionModalOpen, setIsPanelTypeSelectionModalOpen } =
		usePanelTypeSelectionModalStore();

	const onClickHandler = (name: PANEL_TYPES) => (): void => {
		const id = uuid();
		setIsPanelTypeSelectionModalOpen(false);
		logEvent('Dashboard Detail: New panel type selected', {
			panelType: name,
			widgetId: id,
		});

		const queryParams = {
			graphType: name,
			widgetId: id,
			[QueryParams.compositeQuery]: JSON.stringify(
				PANEL_TYPES_INITIAL_QUERY[name],
			),
		};

		history.push(
			`${history.location.pathname}/new?${createQueryParams(queryParams)}`,
		);
	};

	const handleCardClick = (panelType: PANEL_TYPES): void => {
		onClickHandler(panelType)();
	};

	return (
		<Modal
			open={isPanelTypeSelectionModalOpen}
			onCancel={(): void => {
				setIsPanelTypeSelectionModalOpen(false);
			}}
			rootClassName="panel-type-selection-modal"
			footer={null}
			title="New Panel"
		>
			<div className="panel-selection">
				{PanelTypesWithData.map(({ name, icon, display }) => (
					<Card
						onClick={(): void => handleCardClick(name)}
						id={name}
						key={name}
						data-testid={`panel-type-${name}`}
					>
						{icon}
						<Typography className="panel-type-text">{display}</Typography>
					</Card>
				))}
			</div>
		</Modal>
	);
}

export default memo(PanelTypeSelectionModal);
