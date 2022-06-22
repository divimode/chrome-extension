'use strict';

function scanPage() {
	chrome.runtime.onMessage.addListener(handleMessageFromContent);

	chrome.runtime.sendMessage({cmd: 'scanPage'});
}

function handleMessageFromContent(request) {
	if ('updateOverview' === request.cmd) {
		updateOverview(request.data);

		return true;
	}
}

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

	if (data.theme && data.latest_divi_version) {
		if ('Divi' === data.theme || 'Extra' === data.theme) {
			isOkay(
				'general',
				'theme',
				(!data.theme_version || -1 !== compareVersion(
					data.theme_version,
					data.latest_divi_version
				)),
				`Latest version is ${data.latest_divi_version}`
			);
		} else {
			isOkay(
				'general',
				'theme',
				false,
				`Check, if the Divi Builder Plugin is active`
			);
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
		showValue('pfd', 'pfd_is_pro', 'Type', 'Free plugin');
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
		showValue('dap', 'dap_is_pro', 'Type', 'Premium plugin');
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
		const id0 = item.ids[0];
		const id1 = item.ids[1];

		const isPro = -1 !== id0.indexOf('divi-area-');
		const postId = isPro ? id0.replace(/^divi-area-/, '') : '';
		const name = isPro && id1 ? id1.replace(/^divi-area-/, '') : id0;
		const type = isPro ? `Divi Area ${item.type}` : 'On-Page Popup';
		const classes = `divi-area source-${isPro ? 'pro' : 'free'}`;

		const line = [];
		line.push(`<div class="${classes}" data-area-key="${name}">`);
		line.push(`<span class="area-type">${type}</span>`);
		if (isPro) {
			line.push(`<span class="area-id"><small>Post-ID</small> ${postId}</span>`);
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

	const listItem = showValue(group, 'areas', label, lines.join(''));

	if (listItem) {
		setTimeout(() => {
			const items = listItem.querySelectorAll('[data-area-key]');

			items.forEach(item => {
				item.addEventListener('click', onAreaClick);
			});
		}, 50);
	}
}

function onAreaClick(event) {
	const key = this.getAttribute('data-area-key');

	// Send notification to current website.
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function (tabs) {
		chrome.tabs.sendMessage(
			tabs[0].id,
			{
				type: 'dm_support_debug',
				cmd: 'debugArea',
				areaId: key
			}
		);
	});

	window.close();
	event.preventDefault();
	return false;
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

	return list;
}

function showValue(listId, id, label, value, readMore) {
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

	if ('undefined' === typeof value) {
		item.style.display = 'none';
	} else {
		item.style.display = '';
	}

	return item;
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

		const attr = key.substr(prefix.length + 1);
		stats[attr] = data[key];
	});

	return stats;
}

function compareVersion(version1, version2) {
	if (!version1) {
		return -1;
	}
	if (!version2) {
		return 1;
	}

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
