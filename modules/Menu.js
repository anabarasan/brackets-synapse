/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 2, maxerr: 50*/
/*global define, $, brackets, Mustache, window, appshell*/
define(function (require, exports, module) {
	"use strict";
	
	/* region Modules */
	var NodeConnection = brackets.getModule("utils/NodeConnection");
	var Menus = brackets.getModule("command/Menus");
	var CommandManager = brackets.getModule("command/CommandManager");
	var Commands = brackets.getModule("command/Commands");
	var KeyBindingManager = brackets.getModule("command/KeyBindingManager");
	var _ = brackets.getModule("thirdparty/lodash");
	
	var Panel = require("modules/Panel");
	var FileTreeView = require("modules/FileTreeView");
	var Strings = require("strings");
	/* endregion */
	
	/* region Public vars */
	var treeViewContextMenu = null;
	/* endregion */
	
	/* region Private vars */
	var _nodeConnection = null;
	/* endregion */
	
	/* region Public methods */
	var initTreeViewContextMenu,
			setRootMenu,
			setDebugMenu,
			reloadBrackets,
			treeViewContextMenuState;
	/* endregion */
	
	/* region Private methods */
	var _disableTreeViewContextMenuAllItem;
	/* endregion */
	
	/* region Static objects */
	var ContextMenuIds = {
			TREEVIEW_CTX_MENU: "kohei-synapse-treeview-context-menu"
	};
	var ContextMenuCommandIds = {
			SYNAPSE_FILE_NEW: "kohei.synapse.file_new",
			SYNAPSE_DIRECTORY_NEW: "kohei.synapse.directory_new",
			SYNAPSE_FILE_REFRESH: "kohei.synapse.file_refresh",
			SYNAPSE_FILE_RENAME: "kohei.synapse.file_rename",
			SYNAPSE_DELETE: "kohei.synapse.delete"
	};
	var MenuText = {
			SYNAPSE_CTX_FILE_NEW: Strings.SYNAPSE_CTX_FILE_NEW,
			SYNAPSE_CTX_DIRECTORY_NEW: Strings.SYNAPSE_CTX_DIRECTORY_NEW,
			SYNAPSE_CTX_FILE_REFRESH: Strings.SYNAPSE_CTX_FILE_REFRESH,
			SYNAPSE_CTX_FILE_RENAME: Strings.SYNAPSE_CTX_FILE_RENAME,
			SYNAPSE_CTX_DELETE: Strings.SYNAPSE_CTX_DELETE
	};
	/* endregion */
	
	/* region enable flags */
	var Open_TreeView_Context_Menu_On_Directory_State = [
			ContextMenuCommandIds.SYNAPSE_FILE_NEW,
			ContextMenuCommandIds.SYNAPSE_DIRECTORY_NEW,
			ContextMenuCommandIds.SYNAPSE_DELETE,
			ContextMenuCommandIds.SYNAPSE_FILE_REFRESH,
			ContextMenuCommandIds.SYNAPSE_FILE_RENAME
		];
	var Open_TreeView_Context_Menu_On_File_State = [
			ContextMenuCommandIds.SYNAPSE_FILE_RENAME,
			ContextMenuCommandIds.SYNAPSE_DELETE
		];
	var Open_TreeView_Context_Menu_On_Root_State = [
			ContextMenuCommandIds.SYNAPSE_FILE_NEW,
			ContextMenuCommandIds.SYNAPSE_DIRECTORY_NEW,
			ContextMenuCommandIds.SYNAPSE_FILE_REFRESH
		];
	/* endregion */
	
	/* Public Methods */
	treeViewContextMenuState = function (entity) {
		_disableTreeViewContextMenuAllItem();

		if (entity.class === "treeview-root") {
			Open_TreeView_Context_Menu_On_Root_State.forEach(function (id) {
				CommandManager.get(id).setEnabled(true);
			});
			return;
		}
		if (entity.class === "treeview-directory") {
			Open_TreeView_Context_Menu_On_Directory_State.forEach(function (id) {
				CommandManager.get(id).setEnabled(true);
			});
			return;
		} else if (entity.class === "treeview-file") {
			Open_TreeView_Context_Menu_On_File_State.forEach(function (id) {
				CommandManager.get(id).setEnabled(true);
			});
			return;
		}
	};
	
	setRootMenu = function () {
		var menu = CommandManager.register(
			"Synapse",
			"kohei.synapse.mainPanel",
			Panel.showMain);
		var topMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
		topMenu.addMenuDivider();
		topMenu.addMenuItem(menu, {
			key: "Ctrl-Shift-Alt-Enter",
			displayKey: "Ctrl-Shift-Alt-Enter"
		});
		topMenu.addMenuDivider();
		
		setDebugMenu();
	};
	
	setDebugMenu = function () {
		var menu = CommandManager.register(
			"Reload App wiz Node",
			"kohei.syanpse.reloadBrackets",
			reloadBrackets);

		var topMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
		topMenu.addMenuDivider();
		topMenu.addMenuItem(menu, {
			key: "Ctrl-Shift-F6",
			displeyKey: "Ctrl-Shift-F6"
		});
	};
	
	reloadBrackets = function () {
		try {
			_nodeConnection.domains.base.restartNode();
			CommandManager.execute(Commands.APP_RELOAD);
		} catch (e) {
			console.error("Failed trying to restart Node: " + e.message);
		}
	};
	
	initTreeViewContextMenu = function () {
		CommandManager.register(MenuText.SYNAPSE_CTX_FILE_REFRESH, ContextMenuCommandIds.SYNAPSE_FILE_REFRESH, FileTreeView.refresh);
		CommandManager.register(MenuText.SYNAPSE_CTX_FILE_RENAME, ContextMenuCommandIds.SYNAPSE_FILE_RENAME, FileTreeView.rename);
		CommandManager.register(MenuText.SYNAPSE_CTX_FILE_NEW, ContextMenuCommandIds.SYNAPSE_FILE_NEW, FileTreeView.newFile);
		CommandManager.register(MenuText.SYNAPSE_CTX_DIRECTORY_NEW, ContextMenuCommandIds.SYNAPSE_DIRECTORY_NEW, FileTreeView.newDirectory);
		CommandManager.register(MenuText.SYNAPSE_CTX_DELETE, ContextMenuCommandIds.SYNAPSE_DELETE, FileTreeView.removeFile);

		treeViewContextMenu = Menus.registerContextMenu(ContextMenuIds.TREEVIEW_CTX_MENU);
		
		treeViewContextMenu.addMenuItem(ContextMenuCommandIds.SYNAPSE_FILE_REFRESH);
		treeViewContextMenu.addMenuItem(ContextMenuCommandIds.SYNAPSE_FILE_RENAME, null, Menus.LAST, null);
		treeViewContextMenu.addMenuDivider();
		treeViewContextMenu.addMenuItem(ContextMenuCommandIds.SYNAPSE_FILE_NEW, null, Menus.LAST, null);
		treeViewContextMenu.addMenuItem(ContextMenuCommandIds.SYNAPSE_DIRECTORY_NEW, null, Menus.LAST, null);
		treeViewContextMenu.addMenuDivider();
		treeViewContextMenu.addMenuItem(ContextMenuCommandIds.SYNAPSE_DELETE, null, Menus.LAST, null);
		
		//Menus.ContextMenu.assignContextMenuToSelector("(button etc)" menu);
		$("#synapse-treeview-container").contextmenu(function (e) {
			FileTreeView.onTreeViewContextMenu(e, treeViewContextMenu);
		});
	};
	/* Private Methods */
	_disableTreeViewContextMenuAllItem = function () {
		if (treeViewContextMenu === null) {
			return;
		}
		_.forIn(ContextMenuCommandIds, function (val, key) {
			CommandManager.get(val).setEnabled(false);
		});
	};
	/* for Debug */
	_nodeConnection = new NodeConnection();
	_nodeConnection.connect(true);
	
	
	exports.setRootMenu = setRootMenu;
	exports.initTreeViewContextMenu = initTreeViewContextMenu;
	exports.ContextMenuCommandIds = ContextMenuCommandIds;
	exports.ContextMenuIds = ContextMenuIds;
	exports.treeViewContextMenuState = treeViewContextMenuState;

});
