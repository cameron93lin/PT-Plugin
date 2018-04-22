let html_parser = function (raw) {
    let doc = (new DOMParser()).parseFromString(raw, 'text/html');  // 页面解析
    let body = doc.querySelector("body");
    let page = $(body); // 构造 jQuery 对象
    return {
        raw: raw,
        doc: doc,
        body: body,
        page: page,
    }
};

function TimeStampFormatter(data) {
    let unixTimestamp = new Date(data);
    return unixTimestamp.toLocaleString();
}

let system = {
    log: [],  // 脚本日常使用时产生的日志信息
    config: {},   // 脚本日常使用时使用的配置信息（从chrome中获取）
    config_default: {    // 脚本第一次运行时（即获取的配置为空时）或重置时导入的配置信息
        extension: []   // 从 extension/init.json 中导入
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

    initExtension() {
        function render() {
            // 左侧Nav导航以及插件的DOM元素
            $("ul#nav-extension").html(system.config.extension.reduce((a,b) => {
                if (b.enable) {
                    $.getScript(`extension/${b.script}.js`,() => {system.AddNavListener();});
                    a += `<li><a href="#" data-target="#tab-extension-${b.script}">${b.name}</a></li>`
                }
                return a;
            },""));

            $("#config-extension").html(system.config.extension.reduce((a,b) => {
                return a + `<div class="list-group-item" data-name="${b.name}" data-script="${b.script}"><div class="switch"><input type="checkbox" name="extension-${b.script}" ${b.enable ? "checked" : ""}><label>${b.name}</label></div></div>`
            },""));
            $("#config-extension input[type='checkbox']").change(() => {system.ConfigRewriteExtension();});
        }

        if (system.config.extension.length === 0){
            $.getJSON("extension/init.json",data => {
                system.config.extension = data.extension;
                render();
            });
        } else {
            render();
        }
    },  // 扩展插件动态加载

    ConfigRewriteExtension() {
        system.config.extension = $("#config-extension > div").map((i,item) => {
            let rObj = {};
            let tag = $(item);
            rObj["enable"] = tag.find("input[type='checkbox']").prop("checked");
            rObj["name"] = tag.attr("data-name");
            rObj["script"] = tag.attr("data-script");
            return rObj;
        }).get();
        system.initExtension();
        system.saveConfig(true);
    },  // 重写扩展插件配置


    AddNavListener() {

        $("ul.nav > li").click(function () {

            let tag = $(this);

            $("ul.nav > li.active").removeClass("active");

            $("div.top-nav").hide();
            tag.addClass("active");

            let target_select = tag.find("a").attr("data-target");
            $(target_select).show();
            history.pushState({}, null, window.location.href.replace(/tab=[^&]+/,`tab=${target_select.slice(5)}`));
        });

        $("ul.nav > li > a[data-target='#tab-help']").click(() => {
            $("#system-log").text(system.log.join("\n"));
        });

        let target = (window.location.search.match(/tab=([^&#]+)/) || ["","overview-personal-info"])[1];
        $(`ul.nav > li > a[data-target='#tab-${target}']`).click();
    },

    initConfig: function () {
        system.AddNavListener();
        system.initExtension();
        system.initRulePage();
        system.initBackupPage();
        system.initHelpPage();
        new Clipboard('.btn-clipboard');
    },

    initRulePage() {

        $('#config-extension').sortable({
            finish: () => {system.ConfigRewriteExtension();}
        });


    },  // 基本设置页面

    initBackupPage() {  // TODO 检查所有方法
        $("input#config-file").change(() => {
            let restoreFile = $("#config-file")[0];
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

                        system.initConfig();
                        system.saveConfig(true);
                        // system.showSuccessMsg("参数已恢复");
                    }

                };
                r.onerror = function () {
                    system.showErrorMsg("配置信息加载失败");
                    console.log("配置信息加载失败");
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
            system.saveFileAs("PT-plugin-config.json", config_str);
        });  // 备份到文件
        $("button#button-config-import").click(() => {
            $("#file-config").click();
        });  // 从文件中恢复
        $("button#button-config-restore").click(() => {
            system.config = system.config_default;
            system.initConfig();
            system.saveConfig(true);
            system.showSuccessMsg("已重置到默认状态");
        });  // 重置到默认状态
        $("button#button-log-export").click(() => {
            system.saveFileAs("PT-plugin-log.log", system.log.join("\n"),{"type": "text/plain","endings": "native"});
        });  // 导出日志
        $("button#button-log-clean").click(() => {
            system.log = [];
            system.WriteLog("Cleaned History Log.");
        });  // 清空日志

        /* $("#button-config-sync-save").click(function () {
            let button = $(this);
            button.prop("disabled", true);
            system.sendMessage({
                action: "save-config-to-google",
                config: system.config
            }, function () {
                button.prop("disabled", false);
                system.showSuccessMsg("参数已备份至Google 帐户");
            });
        }); */  // 3 备份参数设置至google帐户
        /* $("#button-config-sync-get").click(function () {
            let button = $(this);
            button.prop("disabled", true);
            system.sendMessage({
                action: "read-config-from-google"
            }, function (result) {
                if (result) {
                    system.config = result;
                    system.initConfig();
                    system.saveConfig(true);
                    system.showSuccessMsg("参数已从Google 帐户中恢复");
                } else {
                    alert("加载失败或 Google 帐户中无配置信息。");
                }

                button.prop("disabled", false);
            });
        }); */  // 4 从google帐户中恢复设置
    },  // 备份页面

    initHelpPage() {
        chrome.storage.sync.get({log: system.log},items => {
            system.log = items.log;

            // Limit Log Array Length
            let show_log = system.log;
            let log_limit = 20;
            if (show_log.length > log_limit) {  // 只显示最新的多少条日志，
                show_log = show_log.slice(show_log.length - log_limit,show_log.length).reverse();
            }

            $("#system-log").text(show_log.join("\n"));
        });
    },


    WriteLog(log) {
        let now = TimeStampFormatter(Date.now());
        system.log.push(`${now} - ${log}`);

        chrome.storage.sync.set({log:system.log});
    },


    init: function () {
        $.ajaxSetup({
            cache: true
        });  // 启用jQuery的AJAX缓存

        if (!window.location.search) window.location.search += "?tab=overview-personal-info";

        // 1. 获取设置并初始化所有设置
        chrome.storage.sync.get({config: system.config_default},items => {
            system.config = items.config;
            system.initConfig()
        });


        // 2. 给各种按钮增加监听策略
        // 2.1 左侧导航条激活效果及各页面切换



        // 2.2 总览


        // 2.4 参数设置
    },

    saveConfig(saveOnly) {
        if (!saveOnly) {

        }

        chrome.storage.sync.set({config:system.config});
    },


    showMessage: (msg,options) => {
        new $.zui.Messager(msg, options || {}).show(); // 优先使用传入的options
    },

    showInfoMessage:  msg => {
        system.showMessage(msg,{icon: 'bell'});
    },
    showErrorMessage: msg => {
        system.showMessage(msg,{type: 'warning'});
    },
};