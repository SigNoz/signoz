interface HeaderProps {
	entity: string;
	heading: string;
	imgURL: string;
	docsURL: string;
	imgClassName: string;
}

export default function Header({
	entity,
	heading,
	imgURL,
	docsURL,
	imgClassName,
}: HeaderProps) {
	return (
		<div className="header">
			<img className={imgClassName} src={imgURL} alt="" />
			<div className="title">
				<h1>{heading}</h1>

				<div className="detailed-docs-link">
					View detailed docs
					<a target="_blank" href={docsURL}>
						here
					</a>
				</div>
			</div>
		</div>
	);
}
