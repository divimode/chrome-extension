/**
 * This script is dynamically injected into the actual webpage to display or
 * debug Divi Areas on the page.
 */

let $menu;
let area;
let isMinimized = false;
let areaId;
let areaName;
let debugMenuActive = false;
let prefix = '[Divimode Debug]';

function init() {
	$menu = null;
	area = null;
	isMinimized = false;
	debugMenuActive = false;
	areaId = null;

	window.addEventListener('message', handleDebugMessage);

	DiviArea.addAction('show_area', selectArea);
}

function handleDebugMessage({data}) {
	if ('dm_debug_area' !== data.type || !data.areaId) {
		return;
	}

	areaId = '';
	debugMenuActive = true;
	selectArea(DiviArea.getArea(data.areaId));
}

function selectArea(newArea) {
	if (!newArea) {
		console.error(prefix, 'Area not found');
		return;
	}

	let title;

	if (newArea.theId() !== areaId) {
		area = newArea;
		window.area = newArea;
		areaId = area.theId();

		console.log('');
		console.group(prefix, 'Area Details');
		console.log('ID        ', area.theId());

		area.getNames().forEach(fullName => {
			const name = fullName.replace(/^divi-area-/, '');
			console.log('          ', `#${name}`);

			if (!title && name) {
				title = `#${name}`;
			}
		});
		console.log('Type      ', newArea.theType());
		console.log(
			'Closed?   ',
			DiviArea.isClosed(newArea)
				? 'Marked as "Keep Closed"'
				: 'Area is not marked as "Keep Closed"'
		);
		console.groupEnd();

		explainTriggers();
		console.log("\n ", '-'.repeat(100), "\n ");

		if (!title) {
			title = area.theId();
		}
	}

	if (debugMenuActive) {
		showChoice(title);
	}
}

function sendDebugResponse(action, data) {
	const message = {
		...data,
		type: 'dm_debug_response',
		action: action
	};

	window.postMessage(message, '*');
}

function showChoice(title) {
	if (!$menu) {
		$menu = jQuery('<ul id="dm-support-debug-choice"></ul>');
		$menu.append('<li class="title"></li>');
	}

	if (title) {
		areaName = title;
		$menu.find('.title').text(title);
	}

	$menu.find('[data-action]').remove();

	$menu.append('<li data-action="show">Show Area</li>');
	$menu.append('<li data-action="hide">Hide Area</li>');
	$menu.append('<li data-action="elements">Explain Structure</li>');
	$menu.append('<li data-action="screenshot">Screenshot</li>');

	if (DiviArea.isClosed(area)) {
		$menu.append('<li data-action="keep-closed">Reset "Keep Closed"</li>');
	}

	$menu.append('<li data-action="close">Close</li>');
	$menu.appendTo('body');

	maximizeChoice();
	addChoiceHandlers();

	// Enable Divi Areas Debugger.
	if ('undefined' === typeof DiviAreaConfig._debug) {
		DiviAreaConfig._debug = DiviAreaConfig.debug;
	}
	DiviAreaConfig.debug = 1;
}

function hideChoice() {
	debugMenuActive = false;
	hideElements();
	$menu.detach();

	// Reset Divi Areas Debugger.
	DiviAreaConfig.debug = DiviAreaConfig._debug;
	delete DiviAreaConfig._debug;
}

function addChoiceHandlers() {
	removeChoiceHandlers();

	if (isMinimized) {
		$menu.on('click', maximizeChoice);
	} else {
		$menu.on('click', '[data-action]', processChoice);
		$menu.on('click', '.title', minimizeChoice);
	}
}

function removeChoiceHandlers() {
	$menu.off('click', '[data-action]', processChoice);
	$menu.off('click', '.title', minimizeChoice);
	$menu.off('click', maximizeChoice);
}

function minimizeChoice() {
	if (isMinimized) {
		return;
	}

	isMinimized = true;
	jQuery('body').addClass('dm-debug-choice-hidden');
	addChoiceHandlers();
}

function maximizeChoice() {
	if (!isMinimized) {
		return;
	}

	isMinimized = false;
	jQuery('body').removeClass('dm-debug-choice-hidden');
	addChoiceHandlers();
}

function processChoice(event) {
	if (!$menu || !$menu.length || !area) {
		return;
	}

	const action = jQuery(this).data('action');

	switch (action) {
		case 'close':
			hideChoice();
			break;

		case 'show':
			area.show();
			break;

		case 'hide':
			area.hide();
			break;

		case 'elements':
			toggleElements();
			break;

		case 'keep-closed':
			removeKeepClosed();
			break;

		case 'screenshot':
			takeScreenshot();
			break;
	}
}

function toggleElements() {
	if (true === area._elements) {
		hideElements();
	} else {
		showElements();
	}
}

function showElements() {
	area._elements = true;
	area.addClass('dm-debug-elements');

	if (!area.isVisible()) {
		area.show();
	}
	$menu.find('[data-action="elements"]').text('Hide Structure');
}

function hideElements() {
	area.removeClass('dm-debug-elements');
	delete area._elements;

	jQuery(window).off('.dmdebug');
	$menu.find('[data-action="elements"]').text('Explain Structure');
}

function takeScreenshot() {
	const capture = () => {
		const $wrap = area.getWrap();
		const position = $wrap.css('position');
		const elementBox = $wrap[0].getBoundingClientRect();
		const data = {
			left: elementBox.left,
			top: elementBox.top,
			width: elementBox.width,
			height: elementBox.height,
			devicePixelRatio: window.devicePixelRatio,
			name: areaName.replace('#', '')
		};

		if ('fixed' !== position) {
			data.top = -window.scrollY;
			data.left = -window.scrollX;

			let elem = $wrap[0];
			while (elem !== document.body && elem !== null) {
				data.top += elem.offsetTop;
				data.left += elem.offsetLeft;
				elem = elem.offsetParent;
			}
		}

		sendDebugResponse('screenshot', data);

		$menu.show();
	};

	$menu.hide();

	if (!area.isVisible()) {
		area.show();
		setTimeout(capture, area.getData('animationspeedin') + 50);
	} else {
		setTimeout(capture, 50);
	}
}

function removeKeepClosed() {
	// Remove the "Keep Closed" flag.
	DiviArea.markClosed(area, -1);

	$menu.find('[data-action="keep-closed"]').remove();
}

function explainTriggers() {
	const triggers = area.getTrigger();

	const dumpList = (label, list) => {
		console.log(label, list.shift());

		list.forEach(item => {
			console.log('          ', item);
		});
	};

	for (let key in triggers) {
		const trigger = triggers[key];
		const args = trigger.getArgs();

		console.group(prefix, `Trigger "${trigger.id}"`);
		console.log('Type      ', trigger.type);
		console.log('Status    ', trigger.isActive() ? 'Active' : 'Inactive');
		console.log('Behavior  ', args.once ? 'Fires only once' : 'Can fire multiple times');

		switch (trigger.type) {
			case 'click':
			case 'hover':
				dumpList('Selector  ', args.selector);
				break;

			case 'delay':
			case 'inactive':
				console.log('Delay     ', args.delay, 'milliseconds');
				break;

			case 'scroll':
				console.log('Distance  ', args.distance, 'px |', args.percent, '%');
				break;

			case 'hash':
				dumpList('Hash      ', args.hashes);
				break;

			case 'exit':
			case 'focus':
			case 'back':
				break;
		}

		console.groupEnd();
	}
}

init();
