import './ContextView.styles.scss';

import cx from 'classnames';
import { ILog } from 'types/api/logs/log';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import ContextLogRenderer from './ContextLogRenderer';

interface LogContextProps {
	log: ILog;
	contextQuery: Query | undefined;
	filters: TagFilter | null;
	isEdit: boolean;
}

function ContextView({
	log,
	filters,
	contextQuery,
	isEdit,
}: LogContextProps): JSX.Element {
	// eslint-disable-next-line react/jsx-no-useless-fragment
	if (!contextQuery) return <></>;

	return (
		<div className={cx('log-context-container', { isEditable: isEdit })}>
			<ContextLogRenderer
				filters={filters}
				log={log}
				query={contextQuery}
				isEdit={isEdit}
			/>
		</div>
	);
}

export default ContextView;
