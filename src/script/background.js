if (!XMLHttpRequest.prototype.sendAsBinary) {
    XMLHttpRequest.prototype.sendAsBinary = function (sData) {
        let nBytes = sData.length, ui8Data = new Uint8Array(nBytes);
        for (let nIdx = 0; nIdx < nBytes; nIdx++) {
            ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
        }
        /* send as ArrayBufferView...: */
        this.send(ui8Data);
        /* ...or as ArrayBuffer (legacy)...: this.send(ui8Data.buffer); */
    };
}

// 为插件添加前端监听功能

// 右键菜单
let menuItemIndexToServerIndex = {};

system.createContextMenus = () => {
    chrome.contextMenus.removeAll();

    system.getConfig(config => {
        let contextMenuId = chrome.contextMenus.create({
            "title": "PT 助手",
            "contexts": ["link","selection"],
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

        let servers = config.servers;
        if (servers.length) {   // 如果用户添加的Remote WebUI
            chrome.contextMenus.create({"type" : "separator", "contexts": [ "link" ], "parentId": contextMenuId,"targetUrlPatterns": config.torrentDownloadLinks});
            for(let i =0 ; i< servers.length ; i++) {
                let thisId = chrome.contextMenus.create({
                    "title": "发送到 " + servers[i].name,
                    "contexts": [ "link" ],
                    "parentId": contextMenuId,
                    "onclick": system.genericOnClick,
                    "targetUrlPatterns": config.torrentDownloadLinks
                });
                menuItemIndexToServerIndex[thisId] = i;
            }
            if (servers.length > 1) {
                chrome.contextMenus.create({"type" : "separator", "contexts": [ "link" ], "parentId": contextMenuId,"targetUrlPatterns": config.torrentDownloadLinks});
                let allId = chrome.contextMenus.create({
                    "title": "发送到 所有下载服务器",
                    "contexts": [ "link" ],
                    "parentId": contextMenuId,
                    "onclick": system.genericOnClick,
                    "targetUrlPatterns": config.torrentDownloadLinks
                });
                menuItemIndexToServerIndex[allId] = -1;
            }
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
    let serverId = menuItemIndexToServerIndex[info.menuItemId];
    system.getConfig(config => {
        if(serverId === -1) { // send to all servers
            for(let i in config.servers) {
                system.getTorrent(config.servers[i], info.linkUrl);
            }
        } else {
            let server = config.servers[serverId];
            //if(server.rutorrentdirlabelask === true && server.type === "ruTorrent WebUI") {
            //    chrome.tabs.sendRequest(tab.id, {"action": "showLabelDirChooser", "url": info.linkUrl, "settings": localStorage, "server": server});
            //}
            //else if (server.qbittorrentlabelask === true && server.type === "qBittorrent WebUI") {
            //    chrome.tabs.sendRequest(tab.id, {"action": "showLabelDirChooser", "url": info.linkUrl, "settings": localStorage, "server": server});
            //} else {
            system.getTorrent(server, info.linkUrl);
            //}
        }
    });
    //console.log("item " + info.menuItemId + " was clicked");
    //console.log("info: " + JSON.stringify(info));
    //console.log("tab: " + JSON.stringify(tab));
    //console.log("index: " + menuItemIndexToServerIndex[info.menuItemId]);
};

system.getTorrent = (server, url, label, dir) => {
    console.log(server, url, label, dir);
    if(url.substring(0,7) === "magnet:") {
        system.dispatchTorrent(server, url, "", label, dir);
    } else {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.overrideMimeType("text/plain; charset=x-user-defined");
        xhr.onreadystatechange = function(data) {
            if(xhr.readyState === 4 && xhr.status === 200) {
                let name = "file.torrent";
                if(this.responseURL.match(/\/([^\/]+.torrent)$/)) {
                    name = this.responseURL.match(/\/([^\/]+.torrent)$/)[1];
                }

                system.dispatchTorrent(server, xhr.responseText, name, label, dir);
            } else if(xhr.readyState === 4 && xhr.status < 99) {
                system.showNotifications({title:"Connection failed",message: "The server sent an irregular HTTP error code: " + xhr.status});
            } else if(xhr.readyState === 4 && xhr.status !== 200) {
                system.showNotifications({title:"Connection failed",message: "The server sent an irregular HTTP error code: " + xhr.status});
            }
        };
        xhr.send(null);
    }
};

system.dispatchTorrent = (server, data, name, label, dir) => {
    switch (server.client) {
        case "Vuze SwingUI":
            system.clients.vuzeSwingAdder(server, data); break;
        case "Torrentflux WebUI":
            system.clients.torrentfluxAdder(server, data, name); break;
        case "Transmission WebUI":
            system.clients.transmissionAdder(server, data); break;
        case "uTorrent WebUI":
            system.clients.uTorrentAdder(server, data); break;
        case "ruTorrent WebUI":
            system.clients.ruTorrentAdder(server, data, label, dir); break;
        case "Vuze HTML WebUI":
            system.clients.vuzeHtmlAdder(server, data); break;
        case "Vuze Remote WebUI":
            system.clients.vuzeRemoteAdder(server, data); break;
        case "Buffalo WebUI":
        case "Buffalo WebUI (OLD!)":
            system.clients.buffaloAdder(server, data, name); break;
        case "qBittorrent WebUI":
            system.clients.qBittorrentAdder(server, data, name, label, dir); break;
        case "Deluge WebUI":
            system.clients.delugeAdder(server, data, name); break;
        case "pyrt WebUI":
            system.clients.pyrtAdder(server, data, name); break;
        case "Tixati WebUI":
            system.clients.tixatiAdder(server, data, name); break;
        case "Hadouken WebUI":
            system.clients.hadoukenAdder(server, data, name); break;
        case "NodeJS-rTorrent WebUI":
            system.clients.nodeJSrTorrentAdder(server, data, name); break;
        case "Synology WebUI":
            system.clients.synologyAdder(server, data, name); break;
        case "flood WebUI":
            system.clients.floodAdder(server, data, name); break;
        case "QNAP DownloadStation":
            system.clients.qnapDownloadStationAdder(server, data, name); break;
        case "tTorrent WebUI":
            system.clients.tTorrentAdder(server, data, name); break;
    }
};

system.displayResponse = function(title, message, error) {
    system.showNotifications({
        title: title,
        message: message
    });
};

// Chrome右下角显示漂浮信息
system.showNotifications = (opts) => {
    opts = $.extend({
        type: "basic",
        iconUrl: "static/icon/icon-128.png",
        title: "PT 助手",
        priority: 0,
        message: "PT 助手测试信息"
    },opts);

    let id = Math.floor(Math.random() * 99999) + "";

    chrome.notifications.create(id, opts, function(myId) { id = myId });

    setTimeout(function(){chrome.notifications.clear(id,() => {});}, 5 * 1e3);
};

system.createContextMenus();

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    system.getConfig(config => {
        if(request.action === "constructContextMenu") {
            system.createContextMenus();
        }
    })
});