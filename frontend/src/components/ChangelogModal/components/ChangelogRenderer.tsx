import './ChangelogRenderer.styles.scss';

import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import {
	ChangelogSchema,
	Media,
	SupportedImageTypes,
	SupportedVideoTypes,
} from 'types/api/changelog/getChangelogByVersion';

interface Props {
	changelog: ChangelogSchema;
}

function renderMedia(media: Media): JSX.Element | null {
	if (SupportedImageTypes.includes(media.ext)) {
		return (
			<img
				src={media.url}
				alt={media.alternativeText || 'Media'}
				width={800}
				height={450}
				className="changelog-media-image"
			/>
		);
	}
	if (SupportedVideoTypes.includes(media.ext)) {
		return (
			<video
				autoPlay
				controls
				controlsList="nodownload noplaybackrate"
				loop
				className="changelog-media-video"
			>
				<source src={media.url} type={media.mime} />
				<track kind="captions" src="" label="No captions available" default />
				Your browser does not support the video tag.
			</video>
		);
	}

	return null;
}

function ChangelogRenderer({ changelog }: Props): JSX.Element {
	const formattedReleaseDate = dayjs(changelog.release_date).format(
		'MMMM D, YYYY',
	);

	return (
		<div className="changelog-renderer">
			<div className="changelog-renderer-line">
				<div className="inner-ball" />
			</div>
			<span className="changelog-release-date">{formattedReleaseDate}</span>
			<div className="changelog-renderer-content">
				{changelog.features && changelog.features.length > 0 && (
					<div className="changelog-renderer-list">
						{changelog.features.map((feature) => (
							<div key={feature.id}>
								<div className="changelog-renderer-section-title">{feature.title}</div>
								{feature.media && renderMedia(feature.media)}
								<ReactMarkdown>{feature.description}</ReactMarkdown>
							</div>
						))}
					</div>
				)}
				{changelog.bug_fixes && changelog.bug_fixes.length > 0 && (
					<div className="changelog-renderer-bug-fixes">
						<div className="changelog-renderer-section-title">Bug Fixes</div>
						{changelog.bug_fixes && (
							<ReactMarkdown>{changelog.bug_fixes}</ReactMarkdown>
						)}
					</div>
				)}
				{changelog.maintenance && changelog.maintenance.length > 0 && (
					<div className="changelog-renderer-maintenance">
						<div className="changelog-renderer-section-title">Maintenance</div>
						{changelog.maintenance && (
							<ReactMarkdown>{changelog.maintenance}</ReactMarkdown>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

export default ChangelogRenderer;
