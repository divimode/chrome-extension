"use strict";

const queryCurrentTab = {
	active: true,
	currentWindow: true
};

chrome.runtime.onMessage.addListener((request) => {
	switch (request.cmd) {
		case 'scanPage':
			loadContentScript();
			break;
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
			files: ['scan-page.js']
		});
	});
}
