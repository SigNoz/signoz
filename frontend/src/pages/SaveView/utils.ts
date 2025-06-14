import { NotificationInstance } from 'antd/es/notification/interface';
import logEvent from 'api/common/logEvent';
import { MenuItemLabelGeneratorProps } from 'components/ExplorerCard/types';
import { showErrorNotification } from 'components/ExplorerCard/utils';
import {
	MetricsExplorerEventKeys,
	MetricsExplorerEvents,
} from 'container/MetricsExplorer/events';
import { UseMutateAsyncFunction } from 'react-query';
import { DeleteViewPayloadProps } from 'types/api/saveViews/types';

type DeleteViewProps = {
	deleteViewAsync: UseMutateAsyncFunction<DeleteViewPayloadProps, Error, string>;
	refetchAllView: MenuItemLabelGeneratorProps['refetchAllView'];
	notifications: NotificationInstance;
	viewId: string;
	hideDeleteViewModal: () => void;
	clearSearch: () => void;
};

export const deleteViewHandler = ({
	deleteViewAsync,
	refetchAllView,
	notifications,
	viewId,
	hideDeleteViewModal,
	clearSearch,
}: DeleteViewProps): void => {
	deleteViewAsync(viewId, {
		onSuccess: () => {
			hideDeleteViewModal();
			clearSearch();
			notifications.success({
				message: 'View Deleted Successfully',
			});
			refetchAllView();
			logEvent(MetricsExplorerEvents.ViewDeleted, {
				[MetricsExplorerEventKeys.Tab]: 'views',
			});
		},
		onError: (err) => {
			showErrorNotification(notifications, err);
		},
	});
};
