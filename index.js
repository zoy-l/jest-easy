/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 776:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const path = __nccwpck_require__(17);
const locatePath = __nccwpck_require__(853);
const pathExists = __nccwpck_require__(813);

const stop = Symbol('findUp.stop');

module.exports = async (name, options = {}) => {
	let directory = path.resolve(options.cwd || '');
	const {root} = path.parse(directory);
	const paths = [].concat(name);

	const runMatcher = async locateOptions => {
		if (typeof name !== 'function') {
			return locatePath(paths, locateOptions);
		}

		const foundPath = await name(locateOptions.cwd);
		if (typeof foundPath === 'string') {
			return locatePath([foundPath], locateOptions);
		}

		return foundPath;
	};

	// eslint-disable-next-line no-constant-condition
	while (true) {
		// eslint-disable-next-line no-await-in-loop
		const foundPath = await runMatcher({...options, cwd: directory});

		if (foundPath === stop) {
			return;
		}

		if (foundPath) {
			return path.resolve(directory, foundPath);
		}

		if (directory === root) {
			return;
		}

		directory = path.dirname(directory);
	}
};

module.exports.sync = (name, options = {}) => {
	let directory = path.resolve(options.cwd || '');
	const {root} = path.parse(directory);
	const paths = [].concat(name);

	const runMatcher = locateOptions => {
		if (typeof name !== 'function') {
			return locatePath.sync(paths, locateOptions);
		}

		const foundPath = name(locateOptions.cwd);
		if (typeof foundPath === 'string') {
			return locatePath.sync([foundPath], locateOptions);
		}

		return foundPath;
	};

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const foundPath = runMatcher({...options, cwd: directory});

		if (foundPath === stop) {
			return;
		}

		if (foundPath) {
			return path.resolve(directory, foundPath);
		}

		if (directory === root) {
			return;
		}

		directory = path.dirname(directory);
	}
};

module.exports.exists = pathExists;

module.exports.sync.exists = pathExists.sync;

module.exports.stop = stop;


/***/ }),

/***/ 853:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const path = __nccwpck_require__(17);
const fs = __nccwpck_require__(147);
const {promisify} = __nccwpck_require__(837);
const pLocate = __nccwpck_require__(667);

const fsStat = promisify(fs.stat);
const fsLStat = promisify(fs.lstat);

const typeMappings = {
	directory: 'isDirectory',
	file: 'isFile'
};

function checkType({type}) {
	if (type in typeMappings) {
		return;
	}

	throw new Error(`Invalid type specified: ${type}`);
}

const matchType = (type, stat) => type === undefined || stat[typeMappings[type]]();

module.exports = async (paths, options) => {
	options = {
		cwd: process.cwd(),
		type: 'file',
		allowSymlinks: true,
		...options
	};

	checkType(options);

	const statFn = options.allowSymlinks ? fsStat : fsLStat;

	return pLocate(paths, async path_ => {
		try {
			const stat = await statFn(path.resolve(options.cwd, path_));
			return matchType(options.type, stat);
		} catch {
			return false;
		}
	}, options);
};

module.exports.sync = (paths, options) => {
	options = {
		cwd: process.cwd(),
		allowSymlinks: true,
		type: 'file',
		...options
	};

	checkType(options);

	const statFn = options.allowSymlinks ? fs.statSync : fs.lstatSync;

	for (const path_ of paths) {
		try {
			const stat = statFn(path.resolve(options.cwd, path_));

			if (matchType(options.type, stat)) {
				return path_;
			}
		} catch {}
	}
};


/***/ }),

/***/ 159:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const Queue = __nccwpck_require__(824);

const pLimit = concurrency => {
	if (!((Number.isInteger(concurrency) || concurrency === Infinity) && concurrency > 0)) {
		throw new TypeError('Expected `concurrency` to be a number from 1 and up');
	}

	const queue = new Queue();
	let activeCount = 0;

	const next = () => {
		activeCount--;

		if (queue.size > 0) {
			queue.dequeue()();
		}
	};

	const run = async (fn, resolve, ...args) => {
		activeCount++;

		const result = (async () => fn(...args))();

		resolve(result);

		try {
			await result;
		} catch {}

		next();
	};

	const enqueue = (fn, resolve, ...args) => {
		queue.enqueue(run.bind(null, fn, resolve, ...args));

		(async () => {
			// This function needs to wait until the next microtask before comparing
			// `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
			// when the run function is dequeued and called. The comparison in the if-statement
			// needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
			await Promise.resolve();

			if (activeCount < concurrency && queue.size > 0) {
				queue.dequeue()();
			}
		})();
	};

	const generator = (fn, ...args) => new Promise(resolve => {
		enqueue(fn, resolve, ...args);
	});

	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount
		},
		pendingCount: {
			get: () => queue.size
		},
		clearQueue: {
			value: () => {
				queue.clear();
			}
		}
	});

	return generator;
};

module.exports = pLimit;


/***/ }),

/***/ 667:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const pLimit = __nccwpck_require__(159);

class EndError extends Error {
	constructor(value) {
		super();
		this.value = value;
	}
}

// The input can also be a promise, so we await it
const testElement = async (element, tester) => tester(await element);

// The input can also be a promise, so we `Promise.all()` them both
const finder = async element => {
	const values = await Promise.all(element);
	if (values[1] === true) {
		throw new EndError(values[0]);
	}

	return false;
};

const pLocate = async (iterable, tester, options) => {
	options = {
		concurrency: Infinity,
		preserveOrder: true,
		...options
	};

	const limit = pLimit(options.concurrency);

	// Start all the promises concurrently with optional limit
	const items = [...iterable].map(element => [element, limit(testElement, element, tester)]);

	// Check the promises either serially or concurrently
	const checkLimit = pLimit(options.preserveOrder ? 1 : Infinity);

	try {
		await Promise.all(items.map(element => checkLimit(finder, element)));
	} catch (error) {
		if (error instanceof EndError) {
			return error.value;
		}

		throw error;
	}
};

module.exports = pLocate;


/***/ }),

/***/ 813:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const fs = __nccwpck_require__(147);
const {promisify} = __nccwpck_require__(837);

const pAccess = promisify(fs.access);

module.exports = async path => {
	try {
		await pAccess(path);
		return true;
	} catch (_) {
		return false;
	}
};

module.exports.sync = path => {
	try {
		fs.accessSync(path);
		return true;
	} catch (_) {
		return false;
	}
};


/***/ }),

/***/ 824:
/***/ ((module) => {

class Node {
	/// value;
	/// next;

	constructor(value) {
		this.value = value;

		// TODO: Remove this when targeting Node.js 12.
		this.next = undefined;
	}
}

class Queue {
	// TODO: Use private class fields when targeting Node.js 12.
	// #_head;
	// #_tail;
	// #_size;

	constructor() {
		this.clear();
	}

	enqueue(value) {
		const node = new Node(value);

		if (this._head) {
			this._tail.next = node;
			this._tail = node;
		} else {
			this._head = node;
			this._tail = node;
		}

		this._size++;
	}

	dequeue() {
		const current = this._head;
		if (!current) {
			return;
		}

		this._head = this._head.next;
		this._size--;
		return current.value;
	}

	clear() {
		this._head = undefined;
		this._tail = undefined;
		this._size = 0;
	}

	get size() {
		return this._size;
	}

	* [Symbol.iterator]() {
		let current = this._head;

		while (current) {
			yield current.value;
			current = current.next;
		}
	}
}

module.exports = Queue;


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 17:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__nccwpck_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__nccwpck_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
// ESM COMPAT FLAG
__nccwpck_require__.r(__webpack_exports__);

;// CONCATENATED MODULE: external "jest"
const external_jest_namespaceObject = require("jest");
// EXTERNAL MODULE: ./node_modules/.pnpm/find-up@5.0.0/node_modules/find-up/index.js
var find_up = __nccwpck_require__(776);
var find_up_default = /*#__PURE__*/__nccwpck_require__.n(find_up);
;// CONCATENATED MODULE: external "assert"
const external_assert_namespaceObject = require("assert");
var external_assert_default = /*#__PURE__*/__nccwpck_require__.n(external_assert_namespaceObject);
// EXTERNAL MODULE: external "path"
var external_path_ = __nccwpck_require__(17);
var external_path_default = /*#__PURE__*/__nccwpck_require__.n(external_path_);
// EXTERNAL MODULE: external "fs"
var external_fs_ = __nccwpck_require__(147);
var external_fs_default = /*#__PURE__*/__nccwpck_require__.n(external_fs_);
;// CONCATENATED MODULE: ./src/jestConfig.ts


function defaultConfig(cwd) {
    const testMatchTypes = ['spec', 'test'];
    const hasSrc = external_fs_default().existsSync(external_path_default().join(cwd, 'src'));
    return {
        collectCoverageFrom: [
            hasSrc && 'src/**/*.{js,jsx,ts,tsx}',
            '!**/node_modules/**',
            '!**/fixtures/**',
            '!**/__test__/**',
            '!**/examples/**',
            '!**/typings/**',
            '!**/types/**',
            '!**/*.d.ts'
        ].filter(Boolean),
        testPathIgnorePatterns: ['/node_modules/'],
        moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
        testMatch: [`**/?*.(${testMatchTypes.join('|')}).(j|t)s?(x)`],
        verbose: true
    };
}

;// CONCATENATED MODULE: ./src/jestArgs.ts
/* harmony default export */ const jestArgs = ({
    all: true,
    automock: true,
    bail: true,
    cache: true,
    cacheDirectory: true,
    changedFilesWithAncestor: true,
    changedSince: true,
    ci: true,
    clearCache: true,
    clearMocks: true,
    collectCoverage: true,
    collectCoverageFrom: true,
    collectCoverageOnlyFrom: true,
    color: true,
    colors: true,
    config: true,
    coverage: true,
    coverageDirectory: true,
    coveragePathIgnorePatterns: true,
    coverageProvider: true,
    coverageReporters: true,
    coverageThreshold: true,
    debug: true,
    detectLeaks: true,
    detectOpenHandles: true,
    env: true,
    errorOnDeprecated: true,
    expand: true,
    filter: true,
    findRelatedTests: true,
    forceExit: true,
    globalSetup: true,
    globalTeardown: true,
    globals: true,
    haste: true,
    ignoreProjects: true,
    init: true,
    injectGlobals: true,
    json: true,
    lastCommit: true,
    listTests: true,
    logHeapUsage: true,
    maxConcurrency: true,
    maxWorkers: true,
    moduleDirectories: true,
    moduleFileExtensions: true,
    moduleNameMapper: true,
    modulePathIgnorePatterns: true,
    modulePaths: true,
    noStackTrace: true,
    notify: true,
    notifyMode: true,
    onlyChanged: true,
    onlyFailures: true,
    outputFile: true,
    passWithNoTests: true,
    preset: true,
    prettierPath: true,
    projects: true,
    reporters: true,
    resetMocks: true,
    resetModules: true,
    resolver: true,
    restoreMocks: true,
    rootDir: true,
    roots: true,
    runInBand: true,
    runTestsByPath: true,
    runner: true,
    selectProjects: true,
    setupFiles: true,
    setupFilesAfterEnv: true,
    shard: true,
    showConfig: true,
    silent: true,
    skipFilter: true,
    snapshotSerializers: true,
    testEnvironment: true,
    testEnvironmentOptions: true,
    testFailureExitCode: true,
    testLocationInResults: true,
    testMatch: true,
    testNamePattern: true,
    testPathIgnorePatterns: true,
    testPathPattern: true,
    testRegex: true,
    testResultsProcessor: true,
    testRunner: true,
    testSequencer: true,
    testTimeout: true,
    transform: true,
    transformIgnorePatterns: true,
    unmockedModulePathPatterns: true,
    updateSnapshot: true,
    useStderr: true,
    verbose: true,
    watch: true,
    watchAll: true,
    watchPathIgnorePatterns: true,
    watchman: true,
});

;// CONCATENATED MODULE: ./src/jestRun.ts







const jestConfig = ['jest.config.js'];
function isDefault(obj) {
    return obj.default ?? obj;
}
function mergeConfig(defaultConfig, config, args) {
    const ret = { ...defaultConfig };
    if (!config)
        return;
    Object.keys(config).forEach((key) => {
        const val = config[key];
        ret[key] = typeof val === 'function' ? val(ret[key], args) : val;
    });
    return ret;
}
function formatArgs(args) {
    // Generate jest options
    const argsConfig = Object.keys(jestArgs).reduce((prev, name) => {
        if (args[name])
            prev[name] = args[name];
        // Convert alias args into real one
        const { alias } = jestArgs[name];
        if (alias && args[alias])
            prev[name] = args[alias];
        return prev;
    }, {});
    return argsConfig;
}
/* harmony default export */ async function jestRun(args) {
    process.env.NODE_ENV = 'test';
    // Sometimes the jest.config .js will be used for the rest of the plugins,
    // and the rest of the plugins do not support parameter functioning,
    // which is used to mark differentiation
    process.env.JEST_EASY = 'true';
    const cwd = args.cwd ?? process.cwd();
    const userJestConfigFiles = jestConfig.map((configName) => external_path_default().join(cwd, configName));
    let userJestConfig = userJestConfigFiles.find((configCwd) => external_fs_default().existsSync(configCwd));
    if (!userJestConfig) {
        userJestConfig = await find_up_default()(jestConfig[0]);
    }
    const config = mergeConfig(defaultConfig(cwd), isDefault(
    // @ts-ignore
    userJestConfig ? require(userJestConfig) : {}), args);
    const argsConfig = formatArgs(args);
    // prettier-ignore
    // Run jest
    const result = await (0,external_jest_namespaceObject.runCLI)({
        _: args._ || [],
        $0: args.$0 || '',
        config: JSON.stringify(config),
        ...argsConfig,
    }, [cwd]);
    external_assert_default()(result.results.success, `Test with jest failed`);
}

;// CONCATENATED MODULE: ./src/cli.ts

const args = process.argv.slice(2);
const arg = {};
const _ = [];
args.forEach((c) => {
    if (c.indexOf('-') > -1) {
        arg[c.replace(/-/g, '')] = true;
    }
    else {
        _.push(c);
    }
});
jestRun({ _, ...arg });

})();

module.exports = __webpack_exports__;
/******/ })()
;