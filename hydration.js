/* global components */
/*
 * The custom loader in `./gulp/webpack/hydration-loader.js` will take care of adding components to this file.
 * It will create an async import for every component with a `hydration` property in its `default` export.
 * Based on the property's value it will import either the `default` (true) or `Client` ('vanilla') class.
 *
 * IMPORTANT: After adding a new one or changing the hydration setting of an existing component,
 * this file needs to be saved manually in order to trigger a proper rebuild.
 */
const hydratedComponents = [];
let Vue;
let vueInitializationPromise;

async function initVue() {
	Vue = (await import('vue/dist/vue.esm.js')).default;
}

async function hydrateElement(element) {
	const componentId = element.getAttribute('data-init');

	// Stop if component does not exist or element was already been hydrated
	if (!components[componentId] || element.hasAttribute('data-initialized')) {
		return;
	}

	// Mark immediately as initialized (in case the init event is triggered again while the async component is still initializing)
	element.setAttribute('data-initialized', 'true');

	// Load component chunk
	const hydrationConfig = await components[componentId]();
	const { Component } = hydrationConfig;

	if (!hydrationConfig) {
		return;
	}

	// Init components
	if (!(hydrationConfig.type === true || hydrationConfig.hydration === 'vue')) {
		hydratedComponents.push(new Component(element));
	} else {
		vueInitializationPromise = await (vueInitializationPromise || initVue());

		const propsData = JSON.parse(element.getAttribute('data-context'));

		// Additionally add global from object rendered in page body
		propsData.global = window.JBMSales ? window.JBMSales.global : {};

		// Tell Vue that this is a hydration (Needed for partial hydrations, because Vue SSR renders this attribute only to the outer tag)
		element.setAttribute('data-server-rendered', 'true');

		hydratedComponents.push(new Component({
			el: element,
			propsData,
		}));
	}
}

async function init() {
	const hydrationElements = document.querySelectorAll('[data-init]');

	if (!hydrationElements.length) {
		// No elements with client side hydration found
		return;
	}

	Array.from(hydrationElements).forEach(async element => hydrateElement(element));
}

init();
document.addEventListener('DOMContentLoaded', () => init());
