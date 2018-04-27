// 为插件添加前端监听功能

// 右键菜单

let menuItemIndexToServerIndex = {};

system.createContextMenus = () => {
    chrome.contextMenus.removeAll();

    system.getConfig(config => {
        let contextMenuId = chrome.contextMenus.create({
            "title": "PT 助手",
            "contexts": ["link","selection","page"],
        });
        menuItemIndexToServerIndex[contextMenuId] = 0;

        chrome.contextMenus.create({
            "title": "聚合搜索 '%s' 相关的种子",
            "contexts": ["selection"],
            "parentId": contextMenuId,
            "onclick": (data, tab) => {
                system.requestMessage({
                    action: "options-page",
                    search: {
                        tab: "extension-adv-search",
                        search: data.selectionText
                    },
                });
            }
        });

        let servers = config.client;
        if (servers.length) {   // 如果用户添加的Remote WebUI
            chrome.contextMenus.create({"type" : "separator", "contexts": [ "link" ], "parentId": contextMenuId,"targetUrlPatterns": config.torrentDownloadLinks});
            for(let i =0 ; i< servers.length ; i++) {
                let thisId = chrome.contextMenus.create({
                    "title": "发送到 " + servers[i].tag,
                    "contexts": [ "link" ],
                    "parentId": contextMenuId,
                    "onclick": system.genericOnClick,
                    "targetUrlPatterns": config.torrentDownloadLinks
                });
                menuItemIndexToServerIndex[thisId] = i;
            }
            chrome.contextMenus.create({"type" : "separator", "contexts": [ "link" ], "parentId": contextMenuId,"targetUrlPatterns": config.torrentDownloadLinks});
            let allId = chrome.contextMenus.create({
                "title": "发送到 所有下载服务器",
                "contexts": [ "link" ],
                "parentId": contextMenuId,
                "onclick": system.genericOnClick,
                "targetUrlPatterns": config.torrentDownloadLinks
            });
            menuItemIndexToServerIndex[allId] = -1;
            chrome.contextMenus.create({"type" : "separator", "contexts": [ "link" ], "parentId": contextMenuId,"targetUrlPatterns": config.torrentDownloadLinks});
        }

        chrome.contextMenus.create({
            "title": "打开配置页",
            "contexts": ["link","selection","page"],
            "parentId": contextMenuId,
            "onclick": (data,tab) => {
                system.requestMessage({
                    action: "options-page"
                });
            }
        });
    })
};

system.genericOnClick = (info,tab) => {
    console.log("item " + info.menuItemId + " was clicked");
    console.log("info: " + JSON.stringify(info));
    console.log("tab: " + JSON.stringify(tab));
    console.log("index: " + menuItemIndexToServerIndex[info.menuItemId]);
};

system.createContextMenus();