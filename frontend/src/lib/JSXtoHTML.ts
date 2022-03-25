import { renderToString } from 'react-dom/server';

function JSXtoHTML(str: JSX.Element): HTMLElement {
	const parser = new DOMParser();
	const doc = parser.parseFromString(renderToString(str), 'text/html');
	return doc.body.firstChild as HTMLElement;
}

export default JSXtoHTML;
