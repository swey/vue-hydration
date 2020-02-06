/**
 * Please note: This plugin is used for server side rendering only.
 */
module.exports = {
	install(Vue, options = { globalKeys: ['global'] }) {
		Vue.mixin({
			created() {
				// If the parent has a full hydration (=vue hydration), don't handle the nested components
				if (this.$parent && (this.$parent.$options.hydration === true || this.$parent.$options.hydration === 'vue')) {
					this.$options.hydration = this.$parent.$options.hydration;
					return;
				}

				if (this.$options.hydration && typeof window !== 'object' && this.$vnode) {
					if (!this.$vnode.data) {
						this.$vnode.data = {};
					}

					if (!this.$vnode.data.attrs) {
						this.$vnode.data.attrs = {};
					}

					this.$vnode.data.attrs['data-init'] = this.$options.componentId;

					// Only add the context data if it's a full hydration (for vue). Don't add it for vanilla js hydration
					if (this.$options.hydration === true || this.$options.hydration === 'vue') {
						this.$options.propsData = this.$options.propsData || {};

						const {
							_target, _env, _config, ...context
						} = this.$options.propsData;

						// Remove keys, which are globally available and will be added with the hydration - see "globalData" in hydration.js
						if (options && options.globalKeys) {
							options.globalKeys.forEach(key => delete context[key]);
						}

						this.$vnode.data.attrs['data-context'] = JSON.stringify(context);
					}
				}
			},
			methods: {
				removeHydration() {
					this.$options.hydration = false;
					this.$vnode.data.attrs['data-init'] = null;
					this.$vnode.data.attrs['data-context'] = null;
				}
			}
		});
	}
};
