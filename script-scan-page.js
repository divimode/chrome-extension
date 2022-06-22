/**
 * This file is loaded on demand, when the user clicks the "Scan Page" button
 * inside the extension Popup.
 *
 * When the user clicks the button twice on the same page, this script also runs
 * twice on that page.
 */

window.dmHandlers = window.dmHandlers || {};
window.infos = window.infos || {};

function initScanner() {
	window.dmHandlers.callNum = 0;

	window.addEventListener('message', handleScanMessage);

	callFunction(findLatestDiviVersion);
	callFunction(findLatestPfdVersion);
	callFunction(findLatestDapVersion);

	callFunction(sendSupportRequest, 'origin');
	callFunction(sendSupportRequest, 'theme');
	callFunction(sendSupportRequest, 'jquery');

	callFunction(sendSupportRequest, 'dap_active');
	callFunction(sendSupportRequest, 'pfd_active');

	callFunction(sendSupportRequest, 'dap_version');
	callFunction(sendSupportRequest, 'pfd_version');

	callFunction(sendSupportRequest, 'areas');

	// Clean up when script is loaded a second time.
	const myId = +(new Date);
	window.dmHandlers.scanPage = myId;

	const tmr = setInterval(() => {
		if (window.dmHandlers.scanPage !== myId) {
			window.removeEventListener('message', handleScanMessage);
			clearInterval(tmr);
		}

	}, 250);
}

function handleScanMessage({data}) {
	if ('dm_support_response' !== data.type) {
		return;
	}

	infos[data.response] = data.value;

	if ('origin' === data.response || 'theme' === data.response) {
		findThemeVersion(infos.origin, infos.theme);
	}

	refreshOverview();
}

function callFunction(fn, ...args) {
	setTimeout(
		() => fn.apply(this, args),
		window.dmHandlers.callNum
	);

	window.dmHandlers.callNum++;
}

function sendSupportRequest(command) {
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

function findLatestDiviVersion() {
	if ('undefined' !== typeof infos.latest_divi_version) {
		return;
	}

	fetch('https://license.divimode.com', {
		method: 'POST',
		cors: 'no-cors',
		referrerPolicy: 'no-referrer',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
		},
		body: 'edd_action=get_divi_version'
	})
		.then(response => response.json())
		.then(data => {
			if (data && data.version) {
				infos.latest_divi_version = data.version;
			} else {
				infos.latest_divi_version = '';
			}

			refreshOverview();
		});
}

setTimeout(initScanner, 250);
