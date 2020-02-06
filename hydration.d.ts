import { VueConstructor } from 'vue';

export function hydrate(): Promise<void>;
export function setGlobalHydrationData(globalData: Record<string, any>): void;
export function setVueCallbackFunction(vueCallbackFunction: (Vue: VueConstructor) => void): void;
export default function initHydration(globalData: Record<string, any>, vueCallbackFunction: (Vue: VueConstructor) => void): void;
