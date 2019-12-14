import Vue from 'vue';

declare class VanillaComponent {
	constructor(element: HTMLElement);
}

export default function getComponentInstanceFor(element: HTMLElement): VanillaComponent | Vue | undefined;