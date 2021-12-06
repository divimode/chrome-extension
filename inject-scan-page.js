/**
 * This script is dynamically injected into the actual webpage to request
 * certain JS environment details that are not available inside the extension.
 */

window.addEventListener('message', ({data}) => {
	if ('dm_support_request' !== data.type) {
		return;
	}

	const sendSupportResponse = value => {
		window.postMessage({
			type: 'dm_support_response',
			response: data.cmd,
			value: value
		}, '*');
	};

	const listAreas = () => {
		const list = [];
		const doneIds = [];

		DiviArea.listAreas().forEach(areaId => {
			const area = DiviArea.getArea(areaId);

			if (-1 !== doneIds.indexOf(areaId)) {
				return;
			}

			doneIds.push(...area.allIds());

			list.push({
				ids: area.allIds(),
				type: area.theType()
			});
		});

		return list;
	};

	const dap = window.DiviArea && window.DiviArea.isPro ? window.DiviArea : false;
	const pfd = window.DiviArea && !window.DiviArea.isPro ? window.DiviArea : false;

	switch (data.cmd) {
		case 'jquery':
			sendSupportResponse(window.jQuery ? jQuery.fn.jquery : '');
			break;

		case 'theme':
			if (window.DIVI) {
				sendSupportResponse('Divi');
			} else if (window.EXTRA) {
				sendSupportResponse('Extra');
			} else {
				sendSupportResponse('Unknown');
			}
			break;

		case 'dap_active':
			sendSupportResponse(!!dap);
			break;

		case 'dap_version':
			sendSupportResponse(dap ? dap.version : '');
			break;

		case 'areas':
			sendSupportResponse(dap || pfd ? listAreas() : []);
			break;

		case 'pfd_active':
			sendSupportResponse(!!pfd);
			break;

		case 'pfd_version':
			sendSupportResponse(pfd ? pfd.version : '');
			break;

		case 'origin':
			sendSupportResponse(window.origin);
			break;
	}
});
