/* global components */
/*
 * The "hydration-loader" custom webpack loader will take care of adding components to this file.
 * It will create an async import for every component with a `hydration` property.
 */
window.__hydratedComponentMap = window.__hydratedComponentMap || {};
const hydratedComponentMap = window.__hydratedComponentMap;
let Vue;
let vueInitializationPromise;
let vueCallbackFunction;
let globalData = {};
let uid = 0;

async function initVue() {
	Vue = (await import('vue')).default;

	if (vueCallbackFunction) {
		// Call the defined callback function to give the outside access to the Vue instance, e.g. for adding plugins
		vueCallbackFunction(Vue);
	}
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

	if (!element.id) {
		element.id = 'hydrated-component-' + ++uid;
	}

	// Init components
	let component;
	if (!(hydrationConfig.type === true || hydrationConfig.type === 'vue')) {
		component = new Component(element);
	} else {
		vueInitializationPromise = await (vueInitializationPromise || initVue());

		let propsData = JSON.parse(element.getAttribute('data-context'));

		// Additionally add global from object rendered in page body
		propsData = { ...globalData, ...propsData };

		// Tell Vue that this is a hydration (Needed for partial hydrations, because Vue SSR renders this attribute only to the outer tag)
		element.setAttribute('data-server-rendered', 'true');

		if (typeof Component === 'object') {
			// Vue object handling
			component = new Vue({
				el: element,
				render: createElement => createElement(Component, {
					props: propsData
				}),
			});
		} else {
			// Vue class handling
			component = new Component({
				el: element,
				propsData,
			});
		}
	}

	hydratedComponentMap[element.id] = component;
}

export async function hydrate() {
	const hydrationElements = document.querySelectorAll('[data-init]');

	if (!hydrationElements.length) {
		// No elements with client side hydration found
		return;
	}

	Array.from(hydrationElements).forEach(async element => hydrateElement(element));
}

export function setGlobalHydrationData(_globalData) {
	globalData = _globalData;
}

export function setVueCallbackFunction(_vueCallbackFunction) {
	vueCallbackFunction = _vueCallbackFunction;
}

export default function initHydration(globalData = null, vueCallbackFunction = null) {
	if (globalData) {
		setGlobalHydrationData(globalData);
	}
	if (vueCallbackFunction) {
		setVueCallbackFunction(vueCallbackFunction);
	}

	hydrate();
	document.addEventListener('DOMContentLoaded', () => hydrate());
}