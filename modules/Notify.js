/*jslint node:true, vars:true, plusplus:true, devel:true, nomen:true, regexp:true, white:true, indent:2, maxerr:50 */
/*global define, $, brackets, Mustache, window, console */
define(function (require, exports, module) {
	"use strict";
	
	// HEADER >>
	var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
	var EventDispatcher = brackets.getModule("utils/EventDispatcher");
	var FileSystem = brackets.getModule("filesystem/FileSystem");
	var _ = brackets.getModule("thirdparty/lodash");
	var Strings = require("Strings");
	var PreferenceManager = require("modules/PreferenceManager");
	var CryptoManager = require("modules/CryptoManager");
	var SettingManager = require("modules/SettingManager");
	var Log = require("modules/Log");
	var Utils = require("modules/Utils");
	
	var _base = require("text!../ui/notify/base.html"),
			_secureWarning = require("text!../ui/notify/secureWarning.html"),
			_decryptPassword = require("text!../ui/notify/decryptPassword.html");
	var domain;
	var init,
			_reposition,
			_resetSecureWarning,
			_getLeft,
			show,
			showSecureWarning,
			showDecryptPassword,
			close;
	var _getBase,
			_getDecryptPassword;
	// <<
	
	/**
	 * HTML structure
	 * 
	 * div#sidebar
	 *   └ div#synapse-notify-container
	 *			 └ div.synapse-notify
	 * 			 		 └ div#(dependency)
	 *
	 */
	ExtensionUtils.loadStyleSheet(module, "../ui/css/notify.css");
	
	init = function (_domain) {
		domain = _domain;
		var $container = $("<div>")
				.attr({"id": "synapse-notify-container"})
				.appendTo($("div.main-view")).hide();
		
		$(window).on("resize", function () {
			_reposition();
		});
		return new $.Deferred().resolve().promise();
	};
	
	_getBase = function (id, title, $content) {
		var src = Mustache.render(_base, {id: id, title: title, content: $content}),
				$base = $(src);
		$("button.close", $base).on("click", close);
		return $base;
	};
	
	showDecryptPassword = function () {
		Log.q("Enter the passowrd to decrypt the settings.", false);
		var d = new $.Deferred(),
				src = Mustache.render(_decryptPassword, {Strings: Strings}),
				$base = _getBase("synapse-decrypt-password-notify", Strings.SYNAPSE_DECRYPT_PASSWORD_TITLE, src),
				$container = $("#synapse-notify-container");
		
		$container.html($base).css({"left": _getLeft()}).show();
		
		var $notify = $("#synapse-decrypt-password-notify"),
				$password = $("#synapse-decrypt-password-input", $notify),
				$btn1 = $("#synapse-decrypt-password-btn1", $notify),
				$validMessage = $("p.validateMessage", $notify);
		
		$btn1.on("click", function (e) {
			Log.q("Trying decription to the useable data.");
			var password = $password.val();
			if (password === "") {
				$password.addClass("invalid");
				$validMessage.html("Password is required");
			} else {
				CryptoManager.setSessionPassword(password);
				var settings = null;
				try {
					settings = PreferenceManager.loadServerSettings();
				} catch (e) {
					throw e;
				}
				
				if (!settings) {
					$password.addClass("invalid");
					$validMessage.html("Failed, It is invalid password.");
					Log.q("Failed, It is invalid password.", false);
					$password.val("");
					$password.focus();
				} else {
					$password.removeClass("invalid");
					$validMessage.html("");
					close()
					.then(function () {
						$btn1.off("click");
						Log.q("Success. The server setting was decrypted. ", false);
						d.resolve();
					});
				}
			}
		});
		
		$container.css({"top": "-" + $container.outerHeight() + "px"});
		$container.animate({"top": 0}, "fast").promise()
		.then(function () {
			$("#synapse-decrypt-password-input", $notify).focus();
		});
		return d.promise();
	};
	
	showSecureWarning = function () {
		var d = new $.Deferred(),
				src = Mustache.render(_secureWarning, {Strings: Strings}),
				$base = _getBase("synapse-secure-warning-notify", Strings.SYNAPSE_SECURE_WARNING_TITLE, src),
				$container = $("#synapse-notify-container");
		$container.html($base).css({"left": _getLeft()}).show();
		
		var $notify = $("#synapse-secure-warning-notify"),
				$btn1 = $("#synapse-secure-warning-btn1", $notify),
				$btn2 = $("#synapse-secure-warning-btn2", $notify);
		
		$btn1.on("click", function (e) {
			var $password = $("#crypt-password", $notify),
					$repassword = $("#re-password", $notify),
					$validMessage = $("p.validateMessage");
			if ($password.val() === "" || $password.val() !== $repassword.val() || $password.val().length < 4) {
				$password.addClass("invalid"); $repassword.addClass("invalid");
				$validMessage.html("INPUT PASSWORD IS INVALID.");
			} else {
				$password.removeClass("invalid");
				$repassword.removeClass("invalid");
				$validMessage.html("OK");
				
				var settings = [];
				try {
					settings = PreferenceManager.loadServerSettings();
				} catch(e) {
					console.error(e);
					Log.q("The server settings could not load from Preference files", true);
				}
				CryptoManager.setSessionPassword($password.val());
				PreferenceManager.setUseCrypt(true);
				
				PreferenceManager.saveServerSettings(settings)
				.then(close)
				.then(function () {
					Log.q("Success. The server setting was encrypted. ", false);
					d.resolve();
				}, function (err) {
					throw Utils.getError("", "Notify", "showSecureWarning", err);
				});
			}
		});
		$btn2.one("click", function (e) {
			close()
			.then(function () {
				d.resolve();
			}, function (err) {
				d.reject(err);
			});
		});
		$container.css({"top": "-" + $container.outerHeight() + "px"});
		$container.animate({"top": 0}, "fast").promise()
		.then(function () {
			$("#crypt-password", $notify).focus();
		});
		return d.promise();
	};
	
	close = function () {
		var	$container = $("#synapse-notify-container");
		return $container.animate({"top": "-" + $container.outerHeight() + "px"}, "fast").promise();
	};
	
	_getLeft = function () {
		return (($("div.main-view").outerWidth() - $("#synapse-notify-container").outerWidth()) / 2 )+ "px";
	};
	
	_reposition = function () {
		$("#synapse-notify-container").css({"left": _getLeft, "top": "-" + $("#synapse-notify-container").outerHeight() + "px"});
	};
	
	EventDispatcher.makeEventDispatcher(exports);
	
	exports.init = init;
	exports.show = show;
	exports.showSecureWarning = showSecureWarning;
	exports.showDecryptPassword = showDecryptPassword;
	exports.close = close;
});