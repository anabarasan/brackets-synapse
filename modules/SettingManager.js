/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 2, maxerr: 50, boss: true */
/*global define, $, brackets, Mustache, window, console */
define(function (require, exports, module) {
	"use strict";

	// Modules >
	var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
	var _ = brackets.getModule("thirdparty/lodash");
	var PathManager = require("modules/PathManager");
	var FileManager = require("modules/FileManager");
	var Panel = require("modules/Panel");
	var Strings = require("strings");
	var Utils = require("modules/Utils");
	var CryptoManager = require("modules/CryptoManager");
	var PreferenceManager = require("modules/PreferenceManager");
	var Notify = require("modules/Notify");
	var l = require("modules/Utils").l;
	// <

	// Public Methods >
	var init,
			edit,
			validateAll,
			validate,
			reset,
			getServerList,
			getServerSetting,
			getServerSettingsCache,
			setServerSettings,
			deleteServerSetting;
	// <
	
	// Private Methods >
	var	_rebuildIndex,
			_editServerSetting,
			_saveServerSettings,
			_connectTest,
			_showSettingAlert,
			_hideSettingAlert,
			_appendServerBtnState
			;
	// <
	
	// Observer
	var firstNotice = true;
	var _serverSettings = [];
	var observerNotice = function (changes) {
		console.log(changes);
		if (firstNotice) {
			firstNotice = true;
			return;
		}
		var state = "";
		if (changes.type === "splice") {
			_.forEach(changes, function (change) {
				if (change.addedCount > 0)
					state = "add";
				if (change.removed.length > 0) {
					state = "remove";
				}
			});
			if (state === "add") {
			
			}
			if (state === "remove") {
				
			}
		}
	};
	Array.observe(_serverSettings, observerNotice);
	
	// Listener >
	var onSecureWarningDo,
			onSecureWarningLater;
	// <

	var domain;
	var Server = function () {
		this.protocol = "ftp";
		this.host = null;
		this.port = 21;
		this.user = null;
		this.password = null;
		this.passphrase = null;
		this.privateKey = null;
		this.dir = null;
		this.exclude = null;
	};
	var $serverSetting = null;
	
	var regexp = {
		host: null,
		port: null,
		path: null,
		unix_path: null,
		win_path: null
	};

	/* Public Methods */
	init = function (_domain) {
		var deferred = new $.Deferred();
		domain = _domain;
		
		$serverSetting = $("#synapse-server-setting");
		regexp.host = new RegExp("^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$");
		regexp.port = new RegExp("[1-65535]");
		regexp.unix_path = new RegExp("^$|^\\.\\/.*?|^\\/.*?");
		regexp.win_path = new RegExp("^[a-zA-Z]\\:\\\.*?");

		$("input[type='text'], input[type='password']", $serverSetting).val("").removeClass("invalid");
		$("th > i", $serverSetting).removeClass("done");
		$("th > i.fa-plug", $serverSetting).addClass("done");
		$("button.btn-add").addClass("disabled");
		
		return deferred.resolve(domain).promise();
	};

	edit = function (state) {
		var deferred = new $.Deferred();
		var setting = validateAll();
		
		setting.protocol = $("#currentProtocol").val();
		if (setting.protocol === "sftp") {
			setting.privateKey = Panel.getCurrentPrivateKeyText();
			setting.auth = $("#currentAuth").val();
		}
		if (setting !== false) {
			_appendServerBtnState("disabled");
			_connectTest(setting)
			.then(function (err) {
				deferred.reject(err);
			})
			.then(function () {
				_editServerSetting(state, setting, Panel.getCurrentPrivateKeyText())
					.then(function () {
						Panel.showServerList();
					}, deferred.reject);
			}, function (err) {
				_showSettingAlert("Failed", "Could not connect to server");
				deferred.reject(err);
			}).always(function () {
				_appendServerBtnState("enabled");
			});
		}
		return deferred.promise();
	};

	validateAll = function () {
		var deferred = new $.Deferred();
		var invalid = [];

		var ftp = {
			host 				: {form: $("#synapse-server-host", $serverSetting), icon: $("i.fa-desktop"), invalid: false},
			port 				: {form: $("#synapse-server-port", $serverSetting), icon: $("i.fa-plug"), invalid: false},
			user 				: {form: $("#synapse-server-user", $serverSetting), icon: $("i.fa-user"), invalid: false},
			password		: {form: $("#synapse-server-password", $serverSetting),icon: $("i.fa-unlock"), invalid: false},
			dir	 				: {form: $("#synapse-server-dir", $serverSetting), icon: $("i.fa-sitemap"), invalid: false},
			exclude			: {form: $("#synapse-server-exclude", $serverSetting), icon: $("i.fa-ban"), invalid: false}
		};
		var sftpKey = {
			host 				: {form: $("#synapse-server-host", $serverSetting), icon: $("i.fa-desktop"), invalid: false},
			port 				: {form: $("#synapse-server-port", $serverSetting), icon: $("i.fa-plug"), invalid: false},
			user 				: {form: $("#synapse-server-user", $serverSetting), icon: $("i.fa-user"), invalid: false},
			privateKey	: {form: $("#synapse-server-privateKey-name", $serverSetting), icon: $("i.fa-key"), invalid: false},
			passphrase	: {form: $("#synapse-server-passphrase", $serverSetting), icon: $("i.fa-unlock-alt"), invalid: false},
			dir	 				: {form: $("#synapse-server-dir", $serverSetting), icon: $("i.fa-sitemap"), invalid: false},
			exclude			: {form: $("#synapse-server-exclude", $serverSetting), icon: $("i.fa-ban"), invalid: false}
		};
		var sftpPassword = {
			host 				: {form: $("#synapse-server-host", $serverSetting), icon: $("i.fa-desktop"), invalid: false},
			port 				: {form: $("#synapse-server-port", $serverSetting), icon: $("i.fa-plug"), invalid: false},
			user 				: {form: $("#synapse-server-user", $serverSetting), icon: $("i.fa-user"), invalid: false},
			password		: {form: $("#synapse-server-password", $serverSetting),icon: $("i.fa-unlock"), invalid: false},
			dir	 				: {form: $("#synapse-server-dir", $serverSetting), icon: $("i.fa-sitemap"), invalid: false},
			exclude			: {form: $("#synapse-server-exclude", $serverSetting), icon: $("i.fa-ban"), invalid: false}
		};

		var currentProtocol = $("#currentProtocol").val();
		var auth = $("#currentAuth").val();
		
		var values = "";
		if (currentProtocol === "ftp") {
			values = ftp;
		} else if (currentProtocol === "sftp") {
			if (auth === "key") {
				values = sftpKey;
			} else if (auth === "password") {
				values = sftpPassword;
			}
		}
		
		var keys = Object.keys(values);

		keys.forEach(function (key) {
			values[key].form.removeClass("invalid");
			values[key].invalid = false;
			values[key].icon.removeClass("done");
		});

		var invalidCnt = 0;

		var returnValue = false;

		keys.forEach(function (key) {
			var obj = values[key];
			if (!validate(key, obj.form.val())) {
				obj.invalid = true;
				obj.form.addClass("invalid");
				obj.icon.removeClass("done");
				invalidCnt++;
			} else {
				obj.form.removeClass("invalid");
				obj.icon.addClass("done");
			}
			invalid.push(obj);
		});

		if (invalidCnt === 0) {
			var result = new Server();
			keys.forEach(function(key) {
				result[key] = values[key].form.val();
			});
			_appendServerBtnState("enabled");
			returnValue = result;
		} else {
			_appendServerBtnState("disabled");
		}

		return returnValue;
	};

	validate = function (prop, value) {
		if (prop === "host") {
			return value !== "" && value.match(regexp.host);
		}
		if (prop === "port") {
			return value !== "" && value.match(regexp.port);
		}
		if (prop === "user") {
			return value !== "";
		}
		if (prop === "password") {
			return value !== "";
		}
		if (prop === "privateKey") {
			return value !== "";
		}
		if (prop === "passphrase") {
			return true;
		}
		if (prop === "dir") {
			return value === "" || (value.match(regexp.unix_path) || value.match(regexp.win_path));
		}
		if (prop === "exclude") {
			if (value !== "") {
				var error = false;
				var tmp = value.split(",");
				if (tmp.length > 0) {
					_.forEach(tmp, function (val) {
						if (val.trim() === "") {
							error = true;
						}
					});
				}
				if (error) {
					return false;
				} else {
					return true;
				}
			} else {
				return true;
			}
		}

	};

	reset = function () {
		return init(domain);
	};

	deleteServerSetting = function (index) {
		var deferred = new $.Deferred();
		var slist = getServerSettingsCache();
		
		_serverSettings.splice(index, 1);
		/*
		var result = getServerSetting(index);
		var list = _.filter(slist, function (item, idx, ary) {
			return item.index !== index;
		});
		setServerSettings(list);
		deferred.resolve();
		*/
		/*
		_saveServerSettings(list)
		.then(deferred.resolve);
		*/
		return deferred.promise();
	};

	setServerSettings = function (settings) {
		_.forEach(settings, function (obj) {
			_serverSettings.push(obj);
		});
	};
	
	getServerSetting = function (index) {
		var list = getServerSettingsCache();
		var res = null;
		list.forEach(function (item) {
			if (item.index === index) {
				res = item;
			}
		});
		return res;
	};
	/* Private Methods */
	_appendServerBtnState = function (state) {
		var dev_null = null;
		var _state = state;
		if (state !== "enabled" && state !== "disabled") {
			_state = "enabled";
		}
		var $btn = $(".synapse-server-setting-footer button.btn-add");
		var prop = $btn.prop("disabled");
		if (_state === "disabled") {
			if ($btn.hasClass("disabled")) {
				return;
			} else {
				dev_null = $btn.addClass("disabled");
				dev_null = $btn.prop("disabled", true);
			}
		} else if (_state === "enabled") {
			if (!$btn.hasClass("disabled")) {
				return;
			} else {
				dev_null = $btn.removeClass("disabled");
				dev_null = $btn.prop("disabled", false);
			}
		}
	};

	getServerSettingsCache = function () {
		
		return _serverSettings;
		
		/*
		var preference = PreferencesManager.getExtensionPrefs("brackets-synapse");
		var settings = preference.get("server-settings");
		
		var storedPassword = CryptoManager.getSessionPassword();
		if (PreferenceManager.safeSetting()) {
			if (storedPassword) {
				var decrypted = CryptoManager.decrypt(storedPassword, settings);
				console.log(decrypted);
				_serverSettings = JSON.parse(decrypted);
			} else {
				return "LOCKED";
			}
		} else {
			_serverSettings = JSON.parse(settings);
		}
		return _serverSettings;
		*/
	};

	_editServerSetting = function (state, setting) {
		var list = getServerSettingsCache(),
				deferred = new $.Deferred(),
				index,
				temp = [];

		if (setting.dir.length > 1 && setting.dir !== "./") {
			if (setting.dir.slice(-1) === "/") {
				setting.dir = setting.dir.slice(0, -1);
			}
		}
		if (setting.protocol === "sftp") {
			setting.dir = setting.dir === "" ? "./" : setting.dir;
			if (setting.auth === "key") {
				delete setting.password;
			} else
			if (setting.auth === "password") {
				delete setting.privateKey;
				delete setting.passphrase;
			}
		}
		
		if (setting.protocol === "ftp") {
			delete setting.passphrase;
			delete setting.privateKey;
		}

		if (state === "UPDATE") {
			setting.index = $("#synapse-server-setting").data("index");
			temp = _.map(list, function (item, idx, ary) {
				return (item.index === setting.index) ? setting : item;
			});
			list = temp;
		} else {
			list.push(setting);
		}
		
		setServerSettings(list);
		/*
		_saveServerSettings(list)
			.then(function () {
				deferred.resolve(setting);
			}, deferred.reject);
		*/
		return deferred.promise();
	};

	_saveServerSettings = function (list) {
		var deferred = new $.Deferred();
		var preference = PreferencesManager.getExtensionPrefs("brackets-synapse");
		if (!preference.set("server-settings", JSON.stringify(list))) {
			deferred.reject("could not set server configuration to preference.");
		} else {
			preference.save()
				.then(_rebuildIndex)
				.then(deferred.resolve)
				.fail(function () {
					deferred.reject("could not save server configuration to preference.");
			});
		}
		return deferred.promise();
	};

	_showSettingAlert = function (title, caption) {
		var $container = $("<div/>").addClass("synapse-server-setting-alert")
				.html($("<p/>").html(title).addClass("synapse-server-setting-alert-title"))
				.append($("<p/>").html(caption).addClass("synapse-server-setting-alert-caption"));

		$("#synapse-server-setting").append($container);

		var height = $container.outerHeight();
		var left   = "-" + $container.outerWidth() + "px";
		var settingHeight = $("#synapse-server-setting").height();
		var top = (settingHeight - height) / 2;
		$container.css({"top": top + "px", "left": left});
		$container.animate({"left": 0, "opacity": 1}, 300, function () {
			$("#synapse-server-setting input").addClass("disabled");
			$("#synapse-server-setting input").prop("disabled", true);
			$("#synapse-server-setting button").addClass("disabled");
			$("#synapse-server-setting button").prop("disabled", true);
			$(this).on("click", _hideSettingAlert);
		});
	};

	_hideSettingAlert = function (e) {
		var $container = $(e.currentTarget);
		var left = "-" + $container.outerWidth() + "px";
		$container.off("click", _hideSettingAlert);
		$container.animate({"left": left, "opacity": 0}, 300, function () {
			$("#synapse-server-setting input").removeClass("disabled");
			$("#synapse-server-setting input").prop("disabled", false);
			$("#synapse-server-setting button").removeClass("disabled");
			$("#synapse-server-setting button").prop("disabled", false);
			$container.remove();
		});
	};

	_rebuildIndex = function () {
		var list = getServerSettingsCache();
		var deferred = new $.Deferred();
		var preference = PreferencesManager.getExtensionPrefs("brackets-synapse");
		var i;

		for (i = 0; i < list.length; i++) {
			list[i].index = i + 1;
		}
		if (preference.set("server-settings", JSON.stringify(list))) {
			preference.save().then(deferred.resolve, deferred.reject);
		} else {
			deferred.reject("could not reset server configuration unique id");
		}
		return deferred.promise();
	};

	_connectTest = function (server) {
		var deferred = new $.Deferred();
		var remotePath = server.dir === "" ? "./" : server.dir;

		Panel.showSpinner();
		domain.exec("Connect", server, remotePath)
		.done(function (list) {
			deferred.resolve();
		})
		.fail(function (err) {
			deferred.reject(err);
		})
		.always(function () {
			Panel.hideSpinner();
		});
		return deferred.promise();
	};
	
	
	
	

	exports.init = init;
	exports.edit = edit;
	exports.validateAll = validateAll;
	exports.reset = reset;
	exports.getServerList = getServerList;
	exports.getServerSetting = getServerSetting;
	exports.setServerSettings = setServerSettings;
	exports.getServerSettingsCache = getServerSettingsCache;
	exports.deleteServerSetting = deleteServerSetting;
	exports.getModuleName = function () {
		return module.id;
	};
});
