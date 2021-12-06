"use strict";

const queryCurrentTab = {
	active: true,
	currentWindow: true
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.cmd) {
		case 'scanPage':
			loadContentScript();
			return true;

		case 'screenshot':
			takeScreenshot(sendResponse);
			return true;
	}
});

function loadContentScript() {
	chrome.tabs.query(queryCurrentTab, tabs => {
		if (!tabs.length) {
			console.error('No active Tab found!');
			return;
		}

		chrome.scripting.executeScript({
			target: {tabId: tabs[0].id},
			files: [
				'script-inject.js',
				'script-scan-page.js',
				'script-debug-area.js'
			]
		});
	});
}

function takeScreenshot(sendResponse) {
	chrome.tabs.captureVisibleTab({format: 'png'})
		.then(sendResponse);
}
