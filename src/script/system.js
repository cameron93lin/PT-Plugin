let system = {
    log: [],  // 脚本日常使用时产生的日志信息
    config: {},   // 脚本日常使用时使用的配置信息（从chrome中获取）
    config_default: {    // 脚本第一次运行时（即获取的配置为空时）或重置时导入的配置信息
        extension: [],   // 从 extension/init.json 中导入
        extension_config: {
            example_extension_name: {}  // 示例
        },  // 供插件存放其设置的字典
        pluginIconShowPages: ["*://*/torrents.php*", "*://*/browse.php*", "*://*/rescue.php*","*://*/details.php*", "*://*/plugin_details.php*", "https?://totheglory.im/t/*"],  // 图标展示页面
        contextMenuRules: {
            "torrentDetailPages": ["*://*/details.php*", "*://*/plugin_details.php*", "https?://totheglory.im/t/*"],  // 种子列表页
            "torrentListPages": ["*://*/torrents.php*", "*://*/browse.php*", "*://*/rescue.php*"],  // 种子详情页
            "torrentDownloadLinks": ["*://*/download.php*","*://*/*.torrent*","magnet:\\?xt=urn:btih:*"],  // 种子下载链接格式
        },
        client: {
            default_client_id: 0,  // 默认使用BT客户端ID，为client_list序号
            client_list : [
                {
                    type: "transmission",
                    tag: "Transmission 示例",
                    server: "http://192.168.1.1",
                    port: "9091",
                    username: "",
                    password: "",
                    rpc: "",
                    autostart: false,
                    webui: ""
                },
                {
                    type: "utorrent",
                    tag: "utorrent 示例",
                    server: "",
                    port: "",
                    username: "",
                    password: "",
                    gui: "",
                    webui: ""
                },
                {
                    type:  "deluge",
                    tag: "deluge 示例",
                    server: "",
                    port: "",
                    password: "",
                    gui: "",
                    webui: ""
                },
            ]
        },
        sites: [
            {
                "name": "示例站点，你应该删除该项",   // 站点名称（对个人来说容易识别就行）
                "domain": "https://pt.nexusphp.com/",  // 站点域名（唯一）
                "template": "NexusPHP", // 站点解析模板， 应该在以下值中选取NexusPHP, DIY , NPU, ZX ,TTG, HDChina, HDCity, HDStreet, CCFBits.....
                "info": true,  // 脚本获取用户信息（对PT站点均应启用）
                "info_page": "https://pt.nexusphp.com/userdetails.php?id=1",  // 用户信息页（脚本会读取该页面以获取用户的个人信息）
                "seed_page": "", // 保种页面
                "seed_parser": "",  // 保种页面解析方法
                "info_selector": {  // 用户信息页，脚本在获取用户信息页后使用下列语句获取信息（仅在template为DIY时需要）
                    "id": "location.href.match(/id=(\\d+)/)[1]",   // 用户ID
                    "username": "parser.page.find('a[href^=userdetails]').text()",  // 用户名
                    "uploaded": "", // 上传量
                    "downloaded": "",  // 下载量
                    "ratio": "",     // 分享率
                    "class": "",    // 用户等级
                    "seedtime": "",  // 做种时间
                    "leechtime": "",  // 下载时间
                },
                "info_data": {
                    "record": [
                        {
                            "uploaded": "",  // 上传量
                            "downloaded": "",  // 下载量
                            "ratio": "",     // 分享率
                            "class": "",    // 用户等级
                            "seedtime": "",  // 做种时间
                            "seedcount": "", // 做种数量  （需要从getusertorrentlistajax.php?userid=$id$&type=seeding）中获取（NexusPHP）
                            "seedsize": "", // 做种体积  （需要从getusertorrentlistajax.php?userid=$id$&type=seeding）中获取（NexusPHP）
                            "leechtime": "",  // 下载时间
                            "updateat": "",  // 更新时间
                        }
                    ],
                    "last_update": ""  // 最后更新时间
                },
                "rss": true,  // RSSBoard插件启用状态（站点全局）
                "rss_feed": [
                    {
                        "link": "",  // RSS链接
                        "enable": true,  // 启用状态（单独）
                        "label": ""  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
                    },
                ],
                "search": true,  // Search 插件启用状态（站点全局）
                "search_parser" : "",  // 搜索页面解析方法
                "search_list": [
                    {
                        "link": "",   // 搜索链接   可以使用的统配符有 $page$, $key$
                        "enable": true,  // 该搜索链接启用状态
                        "label": ""  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
                    }
                ]
            },
        ],

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

    targetDefaultClick(default_target) {
        default_target = default_target || "overview-personal-info";
        let target = (window.location.search.match(/tab=([^&#]+)/) || ["",default_target])[1];
        $(`ul.nav > li > a[data-target='#tab-${target}']`).click();
    },

    renderExtension(change) {
        function render() {
            // 左侧Nav导航以及插件的DOM元素
            $("ul#nav-extension").html(system.config.extension.reduce((a,b) => {
                if (b.enable) {
                    a += `<li><a href="#" data-target="#tab-extension-${b.script}">${b.name}</a></li>`
                }
                return a;
            },""));

            $("a[data-target^='#tab-extension-']").click(function () {
                let target = $(this);
                let target_js = target.attr("data-target").slice(15);
                system.loadScript(`extension/${target_js}.js`,function () {
                    system.targetDefaultClick();
                });
            });

            $("#config-extension").html(system.config.extension.reduce((a,b) => {
                return a + `<div class="list-group-item" data-name="${b.name}" data-script="${b.script}"><div class="switch"><input type="checkbox" name="extension-${b.script}" ${b.enable ? "checked" : ""}><label>${b.name}</label></div></div>`
            },""));

            $("#config-extension input[type='checkbox']").change(() => {system.renderExtension(true);});
            system.renderNav();
        }

        if (change) {
            system.config.extension = $("#config-extension > div").map((i,item) => {
                let rObj = {};
                let tag = $(item);
                rObj["enable"] = tag.find("input[type='checkbox']").prop("checked");
                rObj["name"] = tag.attr("data-name");
                rObj["script"] = tag.attr("data-script");
                return rObj;
            }).get();
            system.saveConfig();   // 重写插件设置并保存
        } else if (system.config.extension.length === 0){
            $.getJSON("extension/init.json",data => {
                system.config.extension = data.extension;
                system.saveConfig(true);
                render();
            });
            return
        }
        render();
    },  // 扩展插件动态加载
    renderNav() {
        $("ul.nav > li").click(function () {
            let tag = $(this);

            $("ul.nav > li.active").removeClass("active");
            $("div.top-nav").hide();

            tag.addClass("active");

            let target_select = tag.find("a").attr("data-target");
            $(target_select).show();
            history.pushState({}, null, window.location.href.replace(/tab=[^&]+/,`tab=${target_select.slice(5)}`));
        });

        system.targetDefaultClick();
    },  // 左侧导航渲染方法
    renderPersonInfo() {},
    renderReports() {},
    renderRules() {
        system.loadScript("static/lib/sortable/zui.sortable.min.js",function () {
            $('#config-extension').sortable({
                finish: () => system.renderExtension(true),
            });
        });

        $("#pluginIconShowPages").text(system.config.pluginIconShowPages.join("\n"));
        $("#torrentListPages").text(system.config.contextMenuRules.torrentDetailPages.join("\n"));
        $("#torrentDetailPages").text(system.config.contextMenuRules.torrentListPages.join("\n"));
        $("#torrentLinks").text(system.config.contextMenuRules.torrentDownloadLinks.join("\n"));

        $("#page-rule-save").click(() => {
            system.config.pluginIconShowPages = $("#pluginIconShowPages").val().split("\n");
            system.config.contextMenuRules.torrentDetailPages = $("#torrentListPages").val().split("\n");
            system.config.contextMenuRules.torrentListPages = $("#torrentDetailPages").val().split("\n");
            system.config.contextMenuRules.torrentDownloadLinks = $("#torrentLinks").val().split("\n");
            system.saveConfig();
        });

        $("#page-rule-restore").click(()=> {
            system.config.pluginIconShowPages = system.config_default.pluginIconShowPages;
            system.config.contextMenuRules = system.config_default.contextMenuRules;
            system.saveConfig(true);
        });
    },
    renderBtClient() {},
    renderSite() {},
    renderOther() {
        system.loadScript("static/lib/crypto/crypto-js.min.js");
        system.loadScript("static/lib/filesaver/FileSaver.js");

        $("input#file-config").change(() => {
            let restoreFile = $("#file-config")[0];
            if (restoreFile.files.length > 0 && restoreFile.files[0].name.length > 0) {
                let r = new FileReader();
                r.onload = function (e) {
                    if (confirm("确认要从这个文件中恢复配置吗？这将覆盖当前所有设置信息。")) {
                        let config_backup_key = $("input#input-backup-key").val();
                        let file_content = e.target.result;
                        if (config_backup_key) {
                            let bytes = CryptoJS.AES.decrypt(file_content, config_backup_key);
                            file_content = bytes.toString(CryptoJS.enc.Utf8);
                        }

                        try {
                            system.config = JSON.parse(file_content);
                        } catch (e) {
                            alert("失败，可能该文件未被加密或加密密钥不匹配。")
                        }

                        system.saveConfig(true);
                    }
                };
                r.onerror = function () {
                    system.showErrorMessage("配置信息加载失败");
                    system.writeLog("配置信息加载失败");
                };
                r.readAsText(restoreFile.files[0]);
                restoreFile.value = "";
            }
        });  // 从文件中恢复（底层）

        $("button#button-config-export").click(() => {
            let config_str = JSON.stringify(system.config);
            let config_backup_key = $("input#input-backup-key").val();
            if (config_backup_key) {
                let cipher_text = CryptoJS.AES.encrypt(config_str, config_backup_key);
                config_str = cipher_text.toString();
            }
            system.saveFileAs("PT-plugin.conf", config_str);
        });  // 备份到文件
        $("button#button-config-import").click(() => {
            $("#file-config").click();
        });  // 从文件中恢复
        $("button#button-config-restore").click(() => {
            system.writeLog("重置插件配置到默认状况");
            system.config = system.config_default;
            system.saveConfig(true);
        });  // 重置到默认状态
        $("button#button-log-export").click(() => {
            system.saveFileAs("PT-plugin-log.log", system.log.join("\n"),{"type": "text/plain","endings": "native"});
        });  // 导出日志
        $("button#button-log-clean").click(() => {
            system.log = [];
            system.writeLog("Cleaned History Log.");
        });  // 清空日志
    },
    renderLog() {
        chrome.storage.sync.get({log: system.log},items => {
            const log_limit = 20;
            let show_log = system.log = items.log;

            show_log = show_log.reverse();
            if (system.log.length > log_limit) {  // 只显示最新的多少条日志，
               show_log = show_log.slice(0,log_limit);
            }

            $("#system-log").text(show_log.join("\n"));
        });
    },

    initOptionPage() {  // 在插件后台配置页面渲染以及DOM监听方法（从左到右，从上到下）
        system.renderExtension();  // 扩展插件
        system.renderNav();   // 左侧导航栏，请注意，由于组件是动态加载可配置的，所以在组件变动后，请再次调用这个方法
        // 其他页面渲染方法（只在进入后渲染，而不是一开始渲染好）
        system.renderPersonInfo();  // 个人信息界面
        system.renderReports();     // 信息报表
        system.renderRules();  //  基本设置
        system.renderBtClient();  // 远程下载
        system.renderSite();  // 站点设定
        system.renderOther();  // 其他设定
        system.renderLog();  // 日志信息
        new Clipboard('.btn-clipboard');
    },

    init: function () {
        $.ajaxSetup({
            cache: true
        });  // 启用jQuery的AJAX缓存

        if (!window.location.search) window.location.search += "?tab=overview-personal-info";

        // 1. 获取设置并初始化所有设置
        chrome.storage.sync.get({config: system.config_default},items => {
            system.config = items.config;
            system.initOptionPage();  // 配置页渲染方法
        });
    },

    saveConfig(reload) {
        chrome.storage.sync.set({config:system.config});
        if (reload) {
            system.showSuccessMsg("参数已保存，页面会自动刷新以载入新配置。");
            setTimeout(() => {location.reload();},3000);
        } else {
            system.showSuccessMsg("相关参数已保存。");
        }
        system.writeLog("System Config Changed.")
    },

    writeLog(log) {
        let now = Date.create(Date.now());
        system.log.push(`${now} - ${log}`);
        chrome.storage.sync.set({log:system.log});
        system.renderLog();
    },


    showMessage: (msg,options) => {
        new $.zui.Messager(msg, options || {}).show(); // 优先使用传入的options
    },

    showSuccessMsg: msg => {
        system.showMessage(msg,{icon: 'bell'});
    },

    showInfoMessage:  msg => {
        system.showMessage(msg,{icon: 'bell'});
    },
    showErrorMessage: msg => {
        system.showMessage(msg,{type: 'warning'});
    },

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

system.init();