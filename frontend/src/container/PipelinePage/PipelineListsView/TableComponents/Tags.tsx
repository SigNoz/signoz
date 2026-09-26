import { Badge } from '@signozhq/ui/badge';

function Tags({ tags }: TagsProps): JSX.Element {
	return (
		<span>
			{tags?.map((tag) => (
				<Badge variant="solid" color="highlight-danger" key={tag}>
					{tag}
				</Badge>
			))}
		</span>
	);
}

interface TagsProps {
	tags: Array<string>;
}

export default Tags;
