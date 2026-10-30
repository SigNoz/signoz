import { Skeleton } from '@signozhq/ui/skeleton';

function SavedViewHoverCardSkeleton(): JSX.Element {
	return (
		<Skeleton
			active
			paragraph={{ rows: 3, width: ['100%', '80%', '60%'] }}
			testId="saved-view-hover-card-loading"
		/>
	);
}

export default SavedViewHoverCardSkeleton;
