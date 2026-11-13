import { Typography } from '@signozhq/ui/typography';

function AnnouncementsModal(): JSX.Element {
	return (
		<div className="announcements-modal-container">
			<div className="announcements-modal-container-header">
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					Announcements
				</Typography>
			</div>
		</div>
	);
}

export default AnnouncementsModal;
