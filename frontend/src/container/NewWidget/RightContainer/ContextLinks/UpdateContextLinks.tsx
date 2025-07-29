import { Typography } from 'antd';

interface ContextLink {
	id: string;
	label: string;
	url: string;
	openInNewTab: boolean;
}

interface UpdateContextLinksProps {
	selectedContextLink: ContextLink | null;
}

function UpdateContextLinks({
	selectedContextLink,
}: UpdateContextLinksProps): JSX.Element {
	return (
		<div>
			{selectedContextLink ? (
				<div>
					<Typography.Title level={5}>Context Link Details</Typography.Title>
					<div style={{ marginBottom: 16 }}>
						<Typography.Text strong>ID: </Typography.Text>
						<Typography.Text>{selectedContextLink.id}</Typography.Text>
					</div>
					<div style={{ marginBottom: 16 }}>
						<Typography.Text strong>Label: </Typography.Text>
						<Typography.Text>{selectedContextLink.label}</Typography.Text>
					</div>
					<div style={{ marginBottom: 16 }}>
						<Typography.Text strong>URL: </Typography.Text>
						<Typography.Text>{selectedContextLink.url}</Typography.Text>
					</div>
					<div style={{ marginBottom: 16 }}>
						<Typography.Text strong>Open in New Tab: </Typography.Text>
						<Typography.Text>
							{selectedContextLink.openInNewTab ? 'Yes' : 'No'}
						</Typography.Text>
					</div>
				</div>
			) : (
				<div>
					<Typography.Title level={5}>Add New Context Link</Typography.Title>
					<Typography.Text>
						This is a dummy modal for adding new context links. The actual form
						implementation would go here.
					</Typography.Text>
				</div>
			)}
		</div>
	);
}

export default UpdateContextLinks;
