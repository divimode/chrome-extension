'use strict';

function scanPage() {
	chrome.runtime.sendMessage({cmd: 'scanPage'});
}

chrome.runtime.onMessage.addListener((request) => {
	if ('updateOverview' === request.cmd) {
		updateOverview(request.data);
	}
});

function updateOverview(data) {
	const infoDap = getPluginStats('dap', data);
	const infoPfd = getPluginStats('pfd', data);
	const infoGfd = getPluginStats('gfd', data);

	const themeLabel = [data.theme];
	if (data.theme_version) {
		themeLabel.push(data.theme_version);
	}

	addList('general', 'General');
	showValue('general', 'theme', 'Theme', themeLabel.join(' '));
	showValue('general', 'jquery', 'jQuery', data.jquery);

	if (data.theme) {
		const isDivi = 'Divi' === data.theme || 'Extra' === data.theme;

		if (data.theme_version) {
			const minVersion = '4.4.0';
			isOkay(
				'general',
				'theme',
				isDivi && -1 !== compareVersion(data.theme_version, minVersion),
				`Should be ${minVersion} or higher`
			);
		} else {
			isOkay('general', 'theme', isDivi);
		}
	}

	if (data.jquery) {
		const minVersion = '3.6.0';
		isOkay(
			'general',
			'jquery',
			-1 !== compareVersion(data.jquery, minVersion),
			`Should be ${minVersion} or higher`
		);
	}

	if (infoPfd.active) {
		addList('pfd', 'Popups for Divi');
		showValue('pfd', 'pfd_version', 'Version', data.pfd_version);
		showValue('pfd', 'pfd_is_pro', 'Type', 'Free');
		showAreas('pfd', data.areas);

		if (data.latest_pfd_version) {
			isOkay(
				'pfd',
				'pfd_version',
				-1 !== compareVersion(data.pfd_version, data.latest_pfd_version),
				`Latest version is ${data.latest_pfd_version}`
			);
		}
	}

	if (infoDap.active) {
		addList('dap', 'Divi Areas Pro');
		showValue(
			'dap',
			'dap_version',
			'Version',
			data.dap_version,
			'https://www.elegantthemes.com/marketplace/index.php/wp-json/api/v1/changelog/product_id/1707/'
		);
		showValue('dap', 'dap_is_pro', 'Type', 'Pro');
		showAreas('dap', data.areas);

		if (data.latest_dap_version) {
			isOkay(
				'dap',
				'dap_version',
				-1 !== compareVersion(data.dap_version, data.latest_dap_version),
				`Latest version is ${data.latest_dap_version}`
			);
		}
	}

	if (infoGfd.active) {
		addList('gfd', 'GDPR and Legal');
		// ...
	}
}

function showAreas(group, areas) {
	if (!Array.isArray(areas)) {
		areas = [];
	}

	let label;
	const lines = [];

	areas.forEach(item => {
		const isPro = -1 !== item.ids[0].indexOf('divi-area-');
		const postId = isPro ? item.ids[0].replace(/^divi-area-/, '') : '';
		const name = isPro ? item.ids[1].replace(/^divi-area-/, '') : item.ids[0];

		const line = [];
		line.push(`<div class="divi-area source-${isPro ? 'pro' : 'free'}">`);
		line.push(`<span class="area-type">${item.type}</span>`);
		line.push(`<span class="area-source">${isPro ? 'Divi Area' : 'On-Page'}</span>`);
		if (isPro) {
			line.push(`<span class="area-id">Area ${postId}</span>`);
		}
		line.push(`<span class="area-name">#${name}</span>`);
		line.push(`</div>`);

		lines.push(line.join('&#8203; '));
	});

	if (!areas.length) {
		label = 'No Areas';
		lines.push('-');
	} else if (1 === areas.length) {
		label = `1 Area`;
	} else {
		label = `${areas.length} Areas`;
	}

	showValue(group, 'areas', label, lines.join(''));
}

function addList(id, label) {
	let list = document.querySelector(`#results li.list-wrapper-${id}`);

	if (!list) {
		const results = document.getElementById('results');
		list = document.createElement('li');
		list.setAttribute('class', `list-wrapper list-wrapper-${id}`);
		list.innerHTML = `<strong class="list-label"></strong><ul class="list list-${id}"></ul>`;
		results.appendChild(list);
	}

	list.querySelector('.list-label').innerHTML = label;
}

function showValue(listId, id, label, value, readMore) {
	if ('undefined' === typeof value) {
		return;
	}

	let item = document.querySelector(`#results ul.list-${listId} .item-${id}`);

	if (!item) {
		const list = document.querySelector(`#results ul.list-${listId}`);
		item = document.createElement('li');
		item.setAttribute('class', `item item-${id}`);
		item.innerHTML = '<span class="label"></span> <span class="value"></span>';
		list.appendChild(item);
	}

	item.querySelector('.label').innerHTML = label;
	item.querySelector('.value').innerHTML = value;
}

function isOkay(listId, itemId, okay, message) {
	const item = document.querySelector(`#results ul.list-${listId} .item-${itemId}`);

	if (!item) {
		return;
	}

	item.classList.remove(['item-failed', 'item-passed']);

	if (null !== okay && 'undefined' !== typeof okay) {
		item.classList.add(okay ? 'item-passed' : 'item-failed');
	}
	if (!okay && message) {
		item.setAttribute('data-message', message);
	} else {
		item.removeAttribute('data-message');
	}
}

function getPluginStats(prefix, data) {
	const stats = {};

	Object.keys(data).forEach(key => {
		if (0 !== key.indexOf(`${prefix}_`)) {
			return;
		}

		stats[key.substr(prefix.length + 1)] = data[key];
	});

	return stats;
}

function compareVersion(version1, version2) {
	const parts1 = version1.split('.');
	const parts2 = version2.split('.');

	while (parts1.length < parts2.length) {
		parts1.push('0');
	}

	for (let i = 0; i <= parts1.length; i++) {
		const val1 = parseInt(parts1[i]);
		const val2 = parseInt(parts2[i] || '0');

		if (val1 < val2) {
			return -1;
		} else if (val1 > val2) {
			return 1;
		}
	}

	return 0;
}

scanPage();
