/**
 * This file is loaded on demand, when the user clicks the "Scan Page" button
 * inside the extension Popup.
 *
 * When the user clicks the button twice on the same page, this script also runs
 * twice on that page.
 */

window.infos = window.infos || {};

function scan() {
	findLatestPfdVersion();
	findLatestDapVersion();

	sendMessage('origin');
	sendMessage('theme');
	sendMessage('jquery');

	sendMessage('dap_active');
	sendMessage('dap_version');
	sendMessage('dap_is_pro');

	sendMessage('pfd_active');
	sendMessage('pfd_version');
	sendMessage('pfd_is_pro');

	sendMessage('areas');
}

function injectScripts(onDone) {
	const scripts = ['injected.js', 'global-search.js'];
	let isDone = false;

	scripts.forEach(script => {
		const scriptId = `_divimode_support_script_${script}`;

		if (document.getElementById(scriptId)) {
			isDone = true;
		} else {
			const el = document.createElement('script');
			el.src = chrome.runtime.getURL(script);
			el.setAttribute('id', scriptId);

			if (onDone) {
				const callback = onDone;
				el.onload = () => setTimeout(callback, 100);
				onDone = null;
			}

			(document.head || document.documentElement).appendChild(el);
		}
	});

	if (isDone) {
		onDone();
	}

	window.removeEventListener('message', handleMessage);
	window.addEventListener('message', handleMessage);
}

function handleMessage({data}) {
	if ('dm_support_response' !== data.type) {
		return;
	}

	infos[data.response] = data.value;

	if ('origin' === data.response || 'theme' === data.response) {
		findThemeVersion(infos.origin, infos.theme);
	}

	refreshOverview();
}

function sendMessage(command) {
	window.postMessage({
		type: 'dm_support_request',
		cmd: command
	}, '*');
}

function refreshOverview() {
	chrome.runtime.sendMessage({
		cmd: 'updateOverview',
		data: infos
	});
}

function findThemeVersion(baseUrl, theme) {
	if (!baseUrl || !theme || 'undefined' !== typeof infos.theme_version) {
		return;
	}

	const url = `${baseUrl}/wp-content/themes/${theme}/style.css`;

	fetch(url)
		.then(response => response.text())
		.then(text => {
			const versionInfo = text.match(/Version:\s*([\d.]+)/);

			if (versionInfo) {
				infos.theme_version = versionInfo[1];
			} else {
				infos.theme_version = '';
			}

			refreshOverview();
		});
}

function findLatestPfdVersion() {
	if ('undefined' !== typeof infos.latest_pfd_version) {
		return;
	}

	fetch('https://api.wordpress.org/plugins/info/1.0/popups-for-divi.json', {
		cors: 'no-cors'
	})
		.then(response => response.json())
		.then(data => {
			if (data && data.version) {
				infos.latest_pfd_version = data.version;
			} else {
				infos.latest_pfd_version = '';
			}

			refreshOverview();
		});
}

function findLatestDapVersion() {
	if ('undefined' !== typeof infos.latest_dap_version) {
		return;
	}

	fetch('https://license.divimode.com', {
		method: 'POST',
		cors: 'no-cors',
		referrerPolicy: 'no-referrer',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
		},
		body: 'edd_action=get_version&item_id=14'
	})
		.then(response => response.json())
		.then(data => {
			if (data && data.stable_version) {
				infos.latest_dap_version = data.stable_version;
			} else {
				infos.latest_dap_version = '';
			}

			refreshOverview();
		});
}

injectScripts(scan);
