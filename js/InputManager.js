class InputManager {
	constructor() {
		this.keyListeners = [];

		window.addEventListener("keydown", this.keyPressed.bind(this));
	}

	addListener(type, callback) {
		window.addEventListener(type, callback);
		return callback;
	}

	onKeys(keys, callback) {
		this.keyListeners.push({ keys, callback });
		return callback;
	}

	removeListener(type, callback) {
		window.removeEventListener(type, callback);

		for (let i = this.keyListeners.length - 1; i > -1; i--) {
			if (this.keyListeners[i].callback === callback) {
				this.keyListeners.splice(i, 1);
			}
		}
	}

	keyPressed(event) {
		this.keyListeners.forEach(listener => {
			listener.keys.forEach(key => {
				if (key.toLowerCase() === event.key.toLowerCase()) {
					listener.callback();
				}
			});
		});
	}
}