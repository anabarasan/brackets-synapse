/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50*/
/*global define, location, $, brackets, Mustache, window, appshell*/
define(function (require, exports, module) {
	"use strict";


	var ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
			AppInit = brackets.getModule("utils/AppInit"),
			NodeDomain = brackets.getModule("utils/NodeDomain"),
			CommandManager = brackets.getModule("command/CommandManager"),
			PathManager = require("modules/PathManager"),
			ExtensionDiagnosis = require("modules/ExtensionDiagnosis"),
			Async = brackets.getModule("utils/Async"),
			Menu = require("modules/Menu"),
			Panel = require("modules/Panel"),
			CryptoManager = require("modules/CryptoManager"),
			SettingManager = require("modules/SettingManager"),
			FileTreeView = require("modules/FileTreeView"),
			RemoteManager = require("modules/RemoteManager"),
			FileManager = require("modules/FileManager"),
			PreferenceManager = require("modules/PreferenceManager"),
			Notify = require("modules/Notify"),
			Log = require("modules/Log");

	var COMMAND_ID = "kohei.synapse.mainPanel";

	var _domain = null;

	var $brackets = {
				get toolbar() {
					return $("#main-toolbar .buttons");
				},
				get projectFilesContainer() {
					return $("#project-files-container");
				},
				get sidebar() {
					return $("#sidebar");
				}
			};

	var setAppIcon = function (domain) {
		var d = new $.Deferred(),
				icon = $("<a>")
				.attr({
					id:"synapse-icon",
					"href": "#",
					"title": "Synapse"
				})
				.addClass("diabled")
				.on("click", Menu.showMainPanel)
				.appendTo($brackets.toolbar);
		return d.resolve(_domain).promise();
	};

	AppInit.appReady(function () {
		var domain = new NodeDomain("synapse", ExtensionUtils.getModulePath(module, "node/SynapseDomain"));
		_domain = domain;

		var promises = [];
		var p;

		Log.initView()
		.then(function () {
			p = PreferenceManager.init(domain);
			promises.push(p);

			p = ExtensionDiagnosis.init(domain);
			promises.push(p);

			p = SettingManager.init(domain);
			promises.push(p);

			p = Panel.init(domain);
			promises.push(p);

			p = Notify.init(domain);
			promises.push(p);

			p = PathManager.init(domain);
			promises.push(p);

			p = RemoteManager.init(domain);
			promises.push(p);

			p = FileTreeView.init(domain);
			promises.push(p);

			p = FileManager.init(domain);
			promises.push(p);

			p = setAppIcon(domain);
			promises.push(p);

			p = Menu.setRootMenu(domain);
			promises.push(p);

			Async.waitForAll(promises, true)
			.then(function () {
				Log.q("Synapse initialized done.");
			}, function (err) {
				throw new Error(err);
			});
		}, function (err) {
			console.error("Initialize Log module failed.");
		});
	});
});
