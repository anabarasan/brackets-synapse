/*jslint node: true, vars: true, plusplus: true, devel: true, white: true, nomen: true, regexp: true, indent: 2, maxerr: 50 */
/*global define, $, brackets, Mustache, window, console */
define(function (require, exports, module) {
	"use strict";

	/* region Modules */
	var FileUtils = brackets.getModule("file/FileUtils");
	var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
	var Project = require("modules/Project");
	/* endregion */

	/* region Public vars */
	var remoteRoot = [];
	var isRelative = false;
	/* endregion */

	/* region Private vars */
	var _projectDir;
	/* endregion */

	/* region Public Methods */
	var	init,
			setRemoteRoot,
			completionRemotePath,
			completionLocalPath,
			getPrivateKeysDirectoryPath,
			getRemoteRoot,
			getBaseDirectory,
			getProjectDirectoryPath,
			getLocalRelativePath,
			_onProjectStateChanged;
	/* endregion */

	/* region Static vars */
	var PROJECT_DIR = "__PROJ__";
	/* endregion */


	/* Public Methods */

	init = function (domain) {
		var deferred = new $.Deferred();
		Project.on(Project.PROJECT_STATE_CHANGED, _onProjectStateChanged);

		return deferred.resolve(domain).promise();
	};

	setRemoteRoot = function (_path) {
		// '/.(.*n)/', '/./', '/..$', '/../$'
		
		
		if (_path.match(/(\/\.+\/|\/\.\/|\/\.\.\/?$)/g) && _path !== "./") {
			throw new Error("path is invalid");
		}
		isRelative = (_path.charAt(0) !== "/");
		if (_path === "./") {
			remoteRoot = "./";
		} else {
			remoteRoot = _path.split('/').filter(function (item) {
				return (item !== "") && (item !== ".") && (item !== "..");
			});
		}
	};

	getRemoteRoot = function () {
		console.log({remoteRooot: remoteRoot, isRelative: isRelative});
		var tmp = [].concat(remoteRoot);
		return ((isRelative) ? "" : "/") + tmp.join("/");
	};

	completionRemotePath = function (pathAry) {
		var remotePath = getRemoteRoot();
		console.log(remotePath);
		if (pathAry === false || pathAry.length === 0) {
			return remotePath;
		}
		if (remotePath === "") {
			return pathAry.join("/");
		} else if (remotePath === "/") {
			return "/" + pathAry.join("/");
		} else if (remotePath === "./") {
			return remotePath + pathAry.join("/");
		} else {
			return remotePath + "/" + pathAry.join("/");
		}
	};

	completionLocalPath = function (pathAry) {
		return _projectDir.fullPath + pathAry.join("/");
	};

	getLocalRelativePath = function (path) {

		if (!path || path.substr(0, _projectDir.fullPath.length) !== _projectDir.fullPath) {
			return;
		}

		var result = path.substr(_projectDir.fullPath.length);
		if (result && result[result.length -1 ] === "/") {
			return result.slice(0, -1);
		} else {
			return result;
		}
	};

	getPrivateKeysDirectoryPath = function () {
		var modulePath = FileUtils.getParentPath(ExtensionUtils.getModulePath(module));
		return modulePath + "__KEYS__/";
	};

	getProjectDirectoryPath = function (_path) {
		var path = _path || "";
		var modulePath = FileUtils.getParentPath(ExtensionUtils.getModulePath(module));
		if (path === "#" || path === "") {
			path = modulePath + PROJECT_DIR;
		} else {
			path = modulePath + PROJECT_DIR + "/" + path;
		}
		return path;
	};


	/* Private Methods */

	_onProjectStateChanged = function (e, obj) {
		_projectDir = obj.directory;
	};

	exports.init = init;
	exports.setRemoteRoot = setRemoteRoot;
	exports.getRemoteRoot = getRemoteRoot;
	exports.getPrivateKeysDirectoryPath = getPrivateKeysDirectoryPath;
	exports.completionRemotePath = completionRemotePath;
	exports.completionLocalPath = completionLocalPath;
	exports.getProjectDirectoryPath = getProjectDirectoryPath;
	exports.getLocalRelativePath = getLocalRelativePath;
});
