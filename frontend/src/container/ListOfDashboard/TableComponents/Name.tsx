import { LockFilled } from '@ant-design/icons';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import { Data } from '../DashboardsList';
import { TableLinkText } from './styles';

function Name(name: Data['name'], data: Data): JSX.Element {
	const { id: DashboardId, isLocked } = data;
	const { safeNavigate } = useSafeNavigate();

	const getLink = (): string => `${ROUTES.ALL_DASHBOARD}/${DashboardId}`;

	const onClickHandler = (event: React.MouseEvent<HTMLElement>): void => {
		if (event.metaKey || event.ctrlKey) {
			window.open(getLink(), '_blank');
		} else {
			safeNavigate(getLink());
		}
	};

	return (
		<TableLinkText onClick={onClickHandler}>
			{isLocked && <LockFilled />} {name}
		</TableLinkText>
	);
}

export default Name;
