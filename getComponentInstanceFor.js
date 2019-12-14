window.__hydratedComponentMap = window.__hydratedComponentMap || {};
const hydratedComponentMap = window.__hydratedComponentMap;

export default function getComponentInstanceFor(element) {
	return hydratedComponentMap[element.id];
}