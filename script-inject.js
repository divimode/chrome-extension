/**
 * This file is loaded on demand, when the user opens the Extension Popup. It
 * injects some helper scripts into the current website that can communicate
 * with our extension.
 */

function injectScripts(onDone) {
	const scripts = [
		'inject-scan-page.js',
		'inject-debug-area.js',
		'inject-global-search.js'
	];
	const styles = [
		'inject-debug-area.css'
	];

	scripts.forEach(script => {
		const scriptId = `_divimode_support_script_${script}`;

		if (!document.getElementById(scriptId)) {
			const el = document.createElement('script');
			el.src = chrome.runtime.getURL(script);
			el.id = scriptId;
			(document.head || document.documentElement).appendChild(el);
		}
	});

	styles.forEach(style => {
		const styleId = `_divimode_support_style_${style}`;

		if (!document.getElementById(styleId)) {
			const el = document.createElement('link');
			el.rel = 'stylesheet';
			el.href = chrome.runtime.getURL(style);
			el.id = styleId;
			(document.head || document.documentElement).appendChild(el);
		}
	});
}

injectScripts();
