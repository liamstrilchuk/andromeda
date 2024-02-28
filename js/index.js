window.addEventListener("load", async () => {
	window.reader = new EpubReader(document.getElementById("container"));
	await reader.store.initializeStore();
	reader.init();
});