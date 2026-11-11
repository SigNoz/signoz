// Storybook's docs blocks publish their context as a React context, which is the
// only way to read the stories of the file being documented.
// eslint-disable-next-line no-restricted-imports
import { useContext } from 'react';
import { DocsContext } from '@storybook/addon-docs/blocks';

import styles from './pageDocs.module.scss';

/**
 * The page's states as a list rather than a canvas each. A page story mounts the
 * whole app shell behind msw, so rendering every state on the docs page costs a
 * full boot per state; the name, its description and a link to it carry the same
 * information for a fraction of it.
 */
function StoryStates(): JSX.Element | null {
	const context = useContext(DocsContext);
	const stories = context.componentStories();

	if (stories.length === 0) {
		return null;
	}

	return (
		<section className={styles.states} data-testid="page-docs-states">
			<h2 className={styles.heading}>States</h2>
			<ul className={styles.list}>
				{stories.map((story) => {
					const description = story.parameters?.docs?.description?.story as
						| string
						| undefined;

					return (
						<li className={styles.item} key={story.id}>
							<a
								className={styles.name}
								href={`./?path=/story/${story.id}`}
								target="_top"
							>
								{story.name}
							</a>
							{description ? (
								<p className={styles.description}>{description}</p>
							) : (
								<p className={styles.undocumented}>Undocumented.</p>
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
}

export default StoryStates;
