import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

interface TracesDownloadOptionsMenuProps {
	stagedQuery: Query | null;
}

export default function TracesDownloadOptionsMenu({
	stagedQuery,
}: TracesDownloadOptionsMenuProps): JSX.Element {
	return (
		<DownloadOptionsMenu
			stagedQuery={stagedQuery}
			dataSource={DataSource.TRACES}
		/>
	);
}
