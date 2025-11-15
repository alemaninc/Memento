export function createNotification(text) {
	let notification = document.createElement("div")
	notification.className = "notification";
	notification.innerHTML = text;
	document.getElementById("div_notificationBox").prepend(notification);
	globalThis.setTimeout(function(){notification.remove();}, 6000);
}