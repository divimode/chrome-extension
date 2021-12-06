/**
 * This script is dynamically injected into the actual webpage to display or
 * debug Divi Areas on the page.
 */

let $menu;
let area;
let isMinimized = false;
let areaId;

function init() {
	$menu = null;
	area = null;
	isMinimized = false;
	areaId = null;

	window.removeEventListener('message', handleDebugMessage);
	window.addEventListener('message', handleDebugMessage);
}

function handleDebugMessage({data}) {
	if ('dm_debug_area' !== data.type || !data.areaId) {
		return;
	}

	if (area) {
		hideChoice();
	}

	areaId = data.areaId;

	console.log('[Divimode Debug] Area ID', areaId);

	area = DiviArea.getArea(areaId);

	if (!area) {
		console.error('[Divimode Debug] Area not found');
		return;
	}

	showChoice(areaId);
}

function sendDebugResponse(action, data) {
	const message = {
		...data,
		type: 'dm_debug_response',
		action: action
	};

	window.postMessage(message, '*');
}

function showChoice(areaId) {
	const $body = jQuery('body');
	$menu = jQuery('<ul id="dm-support-debug-choice"></ul>');

	$menu.append('<li class="title"></li>');
	$menu.append('<li data-action="show">Show</li>');
	$menu.append('<li data-action="hide">Hide</li>');
	$menu.append('<li data-action="elements">Elements</li>');
	$menu.append('<li data-action="screenshot">Screenshot</li>');
	$menu.append('<li data-action="close">Close</li>');

	$menu.find('.title').text(`#${areaId}`);

	maximizeChoice();
	addChoiceHandlers();

	$body.append($menu);
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
	if ($menu) {
		$menu.off('click', '[data-action]', processChoice);
		$menu.off('click', '.title', minimizeChoice);
		$menu.off('click', maximizeChoice);
	}
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

		case 'screenshot':
			takeScreenshot();
			break;
	}
}

function hideChoice() {
	hideElements();
	removeChoiceHandlers();

	if ($menu) {
		$menu.remove();
		$menu = null;
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
	const $body = jQuery('body');
	area._elements = true;
	area.addClass('dm-debug-elements');
}

function hideElements() {
	area.removeClass('dm-debug-elements');
	delete area._elements;

	jQuery(window).off('.dmdebug');
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
			name: areaId
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

init();
