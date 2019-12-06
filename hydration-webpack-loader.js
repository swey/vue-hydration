// eslint-disable
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { getOptions } = require('loader-utils');
const validateOptions = require('schema-utils');
// eslint-enable

const schema = {
	type: 'object',
	properties: {
		files: {
			type: 'string'
		},
		getScriptPath: {
			instanceof: 'Function'
		}
	},
	additionalProperties: false
};

module.exports = function(source) {
	const options = Object.assign({
		files: './src/components/**/*.vue',
		getScriptPath: (component) => {
			let scriptPath = path.resolve(component.path);

			if (component.hydrationType === 'vanilla') {
				scriptPath = scriptPath.replace(path.extname(scriptPath), '.client.js');

				// Please note: We check if a .client.js file exists and switch to .ts otherwise
				// While this loader supports defining this function on a project base, we use this check
				// even this operation takes some extra time because it reduces the complexity within the projects
				if (!fs.existsSync(scriptPath)) {
					scriptPath = scriptPath.replace('.js', '.ts');
				}
			}

			return scriptPath;
		},
	}, getOptions(this));

	validateOptions(schema, options, 'Hydration Loader');

	console.time('hydration-loader');

	const components = glob.sync(options.files).map((filePath) => {
		const content = fs.readFileSync(filePath, 'utf8');

		// Get the set hydration type
		const hydrationMatches = content.match(/hydration:\s?'?(\w+)'?/);
		if (!hydrationMatches) {
			return {};
		}

		// Get the componentId for the hydration
		const componentIdMatches = content.match(/componentId:\s?'(\S+)'/);
		if (!componentIdMatches) {
			console.error(`No component id found for hydration of ${filePath}`);
			return {};
		}

		const hydrationType = hydrationMatches[1] === 'true' ? true : hydrationMatches[1];
		const componentId = componentIdMatches[1];

		return {
			path: filePath,
			hydrationType,
			componentId
		};
	}).filter(component => component.hydrationType && component.componentId);

	// Create list of file imports
	const imports = components.map((component) => {
		const scriptPath = options.getScriptPath(component);

		return `'${component.componentId}': async () => ({
			type: ${component.hydrationType === true ? true : `'${component.hydrationType}'`},
			Component: (await import('${scriptPath}')).default
		})`;
	}).join(',');

	// Log time
	console.timeEnd('hydration-loader');

	// Compile new code with babel since it will not be picked up by the default loader anymore
	let newSource = babel.transform(`const components = {${imports}};`, {
		filename: path.resolve(this._module.resource)
	}).code;

	// Has source already "regenerator-runtime" for async loading? Remove the double import
	if (source.match(/import "regenerator-runtime/)) {
		newSource = newSource.replace(/import "regenerator-runtime\/runtime";/, '')
			.replace(/import _asyncToGenerator from "(.+?)";/, '');
	}

	// Append existing source
	newSource += source;

	return newSource;
};
