import { NotificationInstance } from 'antd/es/notification/interface';
import { MenuItemLabelGeneratorProps } from 'components/ExplorerCard/types';
import { showErrorNotification } from 'components/ExplorerCard/utils';
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
		},
		onError: (err) => {
			showErrorNotification(notifications, err);
		},
	});
};
