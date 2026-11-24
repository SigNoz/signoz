import { escapeForInlineScript } from './escapeForInlineScript';

export function buildBootLoader(
	importMapJson: string,
	entrySrc: string,
): string {
	const map = escapeForInlineScript(importMapJson);
	const entry = escapeForInlineScript(entrySrc);

	return (
		'<script>(function(){var b=window.__signozBoot;' +
		'if(!b.supported){b.fail("unsupported");return;}' +
		'var m=document.createElement("script");m.type="importmap";' +
		`m.textContent=${map};document.head.appendChild(m);` +
		'function go(){var s=document.createElement("script");s.type="module";' +
		`s.crossOrigin="anonymous";s.src=${entry};` +
		's.onerror=function(){b.fail("load");};document.head.appendChild(s);}' +
		'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",go);}else{go();}' +
		'})();</script>' +
		`<link rel="modulepreload" crossorigin href="${entrySrc}">`
	);
}
