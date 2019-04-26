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
		getScriptPath: (file) => {
			let scriptPath = path.resolve(file.path);

			if (file.hydration === 'vanilla') {
				scriptPath = scriptPath.replace(path.extname(scriptPath), '.client.js');
			}

			return scriptPath;
		},
	}, getOptions(this));

	validateOptions(schema, options, 'Hydration Loader');

	console.time('hydration-loader');

	const files = glob.sync(options.files).map((filePath) => {
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
	}).filter(file => file.hydrationType && file.componentId);

	// Create list of file imports
	const imports = files.map((file) => {
		const scriptPath = options.getScriptPath(file);

		return `'${file.componentId}': async () => ({
			type: ${file.hydrationType},
			Component: (await import('${scriptPath}')).default
		}),`;
	});

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
