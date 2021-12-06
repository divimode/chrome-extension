/**
 * This file is loaded on demand, when the user clicks the "Scan Page" button
 * inside the extension Popup.
 *
 * When the user clicks the button twice on the same page, this script also runs
 * twice on that page.
 */

window.dmHandlers = window.dmHandlers || {};

function initDebugger() {
	window.addEventListener('message', handleDebugMessage);
	chrome.runtime.onMessage.addListener(handleMessageFromPopup);

	// Clean up when script is loaded a second time.
	const myId = +(new Date);
	window.dmHandlers.debugArea = myId;

	const tmr = setInterval(() => {
		if (window.dmHandlers.debugArea !== myId) {
			window.removeEventListener('message', handleDebugMessage);
			chrome.runtime.onMessage.removeListener(handleMessageFromPopup);
			clearInterval(tmr);
		}

	}, 250);
}

function handleMessageFromPopup(request) {
	if ('debugArea' === request.cmd && request.areaId) {
		sendDebugArea(request.areaId);
		return true;
	}
}

function handleDebugMessage({data}) {
	if ('dm_debug_response' !== data.type) {
		return;
	}

	if ('screenshot' === data.action) {
		captureScreenshot(data);
	}
}

function sendDebugArea(key) {
	window.postMessage({
		type: 'dm_debug_area',
		areaId: key
	}, '*');
}

function captureScreenshot(data) {
	// Get window.devicePixelRatio from the page, not the popup
	const scale = data.devicePixelRatio && data.devicePixelRatio !== 1 ?
		1 / data.devicePixelRatio : 1;

	// if the canvas is scaled, then x- and y-positions have to make up for it
	if (scale !== 1) {
		data.top = data.top / scale;
		data.left = data.left / scale;
		data.width = data.width / scale;
		data.height = data.height / scale;
	}

	chrome.runtime.sendMessage(
		{cmd: 'screenshot'},
		dataUrl => {
			const canvas = document.createElement('canvas');
			document.body.appendChild(canvas);

			const image = new Image();
			image.onload = function () {
				canvas.width = data.width;
				canvas.height = data.height;

				const context = canvas.getContext('2d');
				context.drawImage(image,
					data.left, data.top,
					data.width, data.height,
					0, 0,
					data.width, data.height
				);

				const croppedDataUrl = canvas.toDataURL('png');

				const downloader = document.createElement('a');
				downloader.download = data.name;
				downloader.href = croppedDataUrl;
				downloader.click();
			};

			image.src = dataUrl;
		}
	);
}

setTimeout(initDebugger, 100);
