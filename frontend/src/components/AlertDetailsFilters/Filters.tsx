import './Filters.styles.scss';

import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';

export function Filters(): JSX.Element {
	// const urlQuery = useUrlQuery();
	// const history = useHistory();
	// const relativeTime = urlQuery.get(QueryParams.relativeTime);

	// const handleFiltersReset = (): void => {
	// 	urlQuery.set(QueryParams.relativeTime, RelativeTimeMap['30min']);
	// 	urlQuery.delete(QueryParams.startTime);
	// 	urlQuery.delete(QueryParams.endTime);
	// 	history.replace({
	// 		pathname: history.location.pathname,
	// 		search: `?${urlQuery.toString()}`,
	// 	});
	// };
	return (
		<div className="filters">
			{/* TODO(shaheer): re-enable reset button after fixing the issue w.r.t. updated timeInterval not updating in time picker */}
			{/* {relativeTime !== RelativeTimeMap['30min'] && (
				<Button
					type="default"
					className="reset-button"
					onClick={handleFiltersReset}
					icon={<Undo size={14} />}
				>
					Reset
				</Button>
			)} */}
			<DateTimeSelector showAutoRefresh={false} hideShareModal />
		</div>
	);
}
