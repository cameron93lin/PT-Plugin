let system = {
    log: [],  // 脚本日常使用时产生的日志信息
    config: {},   // 脚本日常使用时使用的配置信息（从chrome中获取）
    clients: {},   // 具体的种子添加方法（从RTA中）
    template: {},  // 具体的站点解析方法
    config_default: {    // 脚本第一次运行时（即获取的配置为空时）或重置时导入的配置信息
        extension: [],   // 从 extension/init.json 中导入
        extension_config: {
            example_extension_name: {}  // 示例
        },  // 供插件存放其设置的字典
        pluginIconShowPages: ["*://*/torrents.php*", "*://*/browse.php*", "*://*/rescue.php*","*://*/details.php*", "*://*/plugin_details.php*", "https?://totheglory.im/t/*"],  // 图标展示页面
        torrentDownloadLinks: ["*://*/download.php*","*://*/*.torrent*","magnet:*"],  // 种子下载链接格式（仅在这些链接中右键点击才显示下载功能）
        servers: [],  // 用来存放下载服务器
        sites: [],   // 用来存放站点信息
        info_update_time: 0,  // 记录更新时间
        info_record: [
            /**    {
            "site": "", // 站点标签名
            "username": "Admin",  // 用户名
            "uploaded": "",  // 上传量
            "downloaded": "",  // 下载量
            "ratio": "",     // 分享率
            "class": "",    // 用户等级
            "seedtime": "",  // 做种时间
            "seedcount": "", // 做种数量  （例如需要从getusertorrentlistajax.php?userid=$id$&type=seeding）中获取（NexusPHP）
            "seedsize": "", // 做种体积   （例如需要从getusertorrentlistajax.php?userid=$id$&type=seeding）中获取（NexusPHP）
            "leechtime": "",  // 下载时间
            "updateat": 0,  // 更新时间（以timestamp形式）
        }
             **/
        ],      //  用来存放站点用户记录信息
    },

    saveFileAs(fileName, fileData, options) {
        try {
            let Blob = window.Blob || window.WebKitBlob;

            // Detect availability of the Blob constructor.
            let constructor_supported = false;
            if (Blob) {
                try {
                    new Blob([], {
                        "type": "text/plain"
                    });
                    constructor_supported = true;
                } catch (_) {
                }
            }

            let b = null;
            if (constructor_supported) {
                b = new Blob([fileData], options || {
                    "type": "text/plain"
                });
            } else {
                // Deprecated BlobBuilder API
                let BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;
                let bb = new BlobBuilder();
                bb.append(fileData);
                b = bb.getBlob("text/plain");
            }

            saveAs(b, fileName);
        } catch (e) {
            console.log(e.toString());
        }
    },

    init: function () {
        // 1. 获取设置并初始化所有设置
        system.getConfig(() => {
            if (location.protocol === "chrome-extension:" && location.pathname === "/options.html") {
                if (!window.location.search) window.location.search += "?tab=overview-personal-info";
                system.initOptionPage();  // 配置页渲染方法
            }
        });
    },

    getConfig(callback) {
        chrome.storage.sync.get({config: system.config_default},items => {
            system.config = items.config;
            localStorage.setItem("servers",system.config.servers);
            callback(system.config);
        });
    },  // 从chrome.storage中获取用户配置

    saveConfig(reload, silence) {
        localStorage.setItem("servers",system.config.servers);
        chrome.storage.sync.set({config:system.config});
        if (reload) {
            system.showSuccessMsg("参数已保存，页面会自动刷新以载入新配置。");
            setTimeout(() => {location.reload();},3000);
        } else if (!silence) {
            system.showSuccessMsg("相关参数已保存。");
        }
        if (!silence) {
            system.writeLog("System Config Changed.");
        }
    },  // 保存用户配置到chrome.storage中

    writeLog(log) {
        let now = Date.create(Date.now()).toLocaleString();   // 注意 Date.create() 不是标准方法，是ZUI引入的快速方法
        system.log.push(`${now} - ${log}`);
        chrome.storage.sync.set({log:system.log});
        system.renderLog();
    },

    // 用于接收页面发送过的消息
    requestMessage: (message, sender, callback) => {
        // console.log(message, sender, callback);
        switch (message.action.toLowerCase()) {
            /*
            case "toclipboard":
                let copyFrom = $('<textarea/>');
                copyFrom.text(message.content);
                $('body').append(copyFrom);
                copyFrom.select();
                document.execCommand('copy');
                copyFrom.remove();
            */

            case "options-page":  // 从前端页面进入options页面
                let search = $.extend({tab: "overview-personal-info"},message.search);

                let url = "options.html?";
                for (let key in search)  {
                    url += `${key}=${search[key]}&`
                }
                url = url.replace(/(.+?)&?$/,"$1");

                chrome.tabs.create({url: url});
                break;
        }
    },

    // Options页面显示漂浮消息
    showMessage: (msg,options) => {
        new $.zui.Messager(msg, options || {icon: 'bell'}).show(); // 优先使用传入的options
    },

    showSuccessMsg: msg => {
        system.showMessage(msg,{icon: 'bell'});
    },

    showErrorMessage: msg => {
        system.showMessage(msg,{type: 'warning'});
    },

    // Options页面动态加载script以及css方法
    dynamicalLoad(url,filetype,callback) {
        let file_ref;
        if (filetype==="js"){ //if filename is a external JavaScript file
            if (document.querySelectorAll(`script[src='${url}']`).length === 0) {
                file_ref = document.createElement('script');
                file_ref.type = 'text/javascript';
                file_ref.src = url;

                // Then bind the event to the callback function, There are several events for cross browser compatibility.
                file_ref.onreadystatechange = callback;
                file_ref.onload = callback;
            }
        }
        else if (filetype==="css"){ //if filename is an external CSS file
            if (document.querySelectorAll(`link[href='${url}']`).length === 0) {
                file_ref = document.createElement("link");
                file_ref.setAttribute("rel", "stylesheet");
                file_ref.setAttribute("type", "text/css");
                file_ref.setAttribute("href", url)
            }
        }
        if (typeof file_ref!=="undefined") {
            document.getElementsByTagName("head")[0].appendChild(file_ref);
        }
    },

    loadScript(url, callback) {
        system.dynamicalLoad(url,"js",callback);
    },

    loadCSS(url) {
        system.dynamicalLoad(url,"css");
    },
};