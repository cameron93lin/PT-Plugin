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

    ConfigRewriteExtension() {
        system.config.extension = $("#config-extension > div").map((i,item) => {
            let rObj = {};
            let tag = $(item);
            rObj["enable"] = tag.find("input[type='checkbox']").prop("checked");
            rObj["name"] = tag.attr("data-name");
            rObj["script"] = tag.attr("data-script");
            return rObj;
        }).get();
        system.renderExtension();  // 重新加载插件
        system.saveConfig(true);   // 重写插件设置并保存
    },  // 扩展插件（底层）

    renderExtension() {
        function render() {
            // 左侧Nav导航以及插件的DOM元素
            $("ul#nav-extension").html(system.config.extension.reduce((a,b) => {
                if (b.enable) {
                    $.getScript(`extension/${b.script}.js`,() => {system.renderNav();});
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
            });  // 加载默认插件
        } else {
            render();
        }
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

        $("ul.nav > li > a[data-target='#tab-help']").click(() => {
            $("#system-log").text(system.log.join("\n"));
        });

        let target = (window.location.search.match(/tab=([^&#]+)/) || ["","overview-personal-info"])[1];
        $(`ul.nav > li > a[data-target='#tab-${target}']`).click();
    },  // 左侧导航渲染方法
    renderPersonInfo() {},
    renderReports() {},
    renderRules() {
        $('#config-extension').sortable({
            finish: () => system.ConfigRewriteExtension(),
        });
    },
    renderBtClient() {},
    renderSite() {},
    renderOther() {
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
            system.writeLog("Cleaned History Log.");
        });  // 清空日志
    },
    renderHelp() {
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

    initOptionPage() {  // 在插件后台配置页面渲染以及DOM监听方法（从左到右，从上到下）
        system.renderExtension();  // 扩展插件
        system.renderNav();   // 左侧导航栏，请注意，由于组件是动态加载可配置的，所以在组件变动后，请再次调用这个方法
        // 其他页面渲染方法（只在进入后渲染，而不是一开始渲染好）
        $("a[data-target='#tab-overview-personal-info']").click(() => system.renderPersonInfo());  // 个人信息界面
        $("a[data-target='#tab-overview-reports']").click(system.renderReports());     // 信息报表
        $("a[data-target='#tab-config-rules']").click(system.renderRules());  //
        $("a[data-target='#tab-config-bt-clients']").click(system.renderBtClient());
        $("a[data-target='#tab-config-sites']").click(system.renderSite());
        $("a[data-target='#tab-config-other']").click(system.renderOther());
        $("a[data-target='#tab-help']").click(system.renderHelp());
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

    saveConfig(saveOnly) {
        if (!saveOnly) {
            // TODO
        }
        chrome.storage.sync.set({config:system.config});
    },

    writeLog(log) {
        let now = TimeStampFormatter(Date.now());
        system.log.push(`${now} - ${log}`);
        chrome.storage.sync.set({log:system.log});
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