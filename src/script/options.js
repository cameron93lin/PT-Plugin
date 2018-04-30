(function($) {

    system.targetDefaultClick = default_target => {
        default_target = default_target || "overview-personal-info";
        let target = (window.location.search.match(/tab=([^&#]+)/) || ["",default_target])[1];
        $(`ul.nav > li > a[data-target='#tab-${target}']`).click();
    };

    system.renderExtension = change => {
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
    };  // 扩展插件动态加载
    system.renderNav = () => {
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
    };  // 左侧导航渲染方法
    system.renderPersonInfo = () => {};
    system.renderReports = () => {};
    system.renderRules = () => {
        $('#config-extension').sortable({
            finish: () => system.renderExtension(true),
        });

        $("#pluginIconShowPages").text(system.config.pluginIconShowPages.join("\n"));
        $("#torrentLinks").text(system.config.torrentDownloadLinks.join("\n"));

        $("#page-rule-save").click(() => {
            system.config.pluginIconShowPages = $("#pluginIconShowPages").val().split("\n");
            system.config.torrentDownloadLinks = $("#torrentLinks").val().split("\n");
            system.saveConfig();
        });

        $("#page-rule-restore").click(()=> {
            system.config.pluginIconShowPages = system.config_default.pluginIconShowPages;
            system.config.torrentDownloadLinks = system.config_default.torrentDownloadLinks;
            system.saveConfig(true);
        });
    };
    system.renderBtClient = () => {
        if($("#server-modal").length === 0) {
            $("body").append(`<div class="modal fade" id="server-modal"><div class="modal-dialog"></div></div>`);
        }

        function ClientTable() {
            let table = `<thead><tr><th>Label</th><th>Type</th><th>Host</th><th>Port</th><th>SSL</th><th>Username</th><th>Action</th></tr></thead>`;

            if (system.config.servers.length === 0) {
                table += `<tbody><tr align="center"><td colspan="7">No BT Servers Added</td></tr></tbody>`
            } else {
                table  = system.config.servers.reduce((a,b,c) => {
                    return a+= `<tr><td>${b.name}</td><td>${b.client}</td><td>${b.host}</td><td>${b.port}</td>
<td>${b.hostsecure ? "<i class=\"icon icon-check\"></i>": "<i class=\"icon icon-times\"></i>"}</td><td>${b.login}</td>
<td>
<a href="${b.webui}" target="_blank"><i class="icon icon-share-alt"></i></a>
<a href="#" data-id="${c}" class="server-edit"><i class="icon icon-edit"></i></a>
<a href="#" data-id="${c}" class="server-delete"><i class="icon icon-remove-sign"></i></a></td></tr>`
                },table + "<tbody>");
                table += "</tbody>";
            }

            $("#server-list").html(table);

            $(".server-edit").click(function () {
                let that = $(this);
                let lid = that.attr("data-id");
                let config = system.config.servers[lid];
                config_html(config["client"],config["name"],config,lid);
                $("#server-modal").modal();
            })

            $(".server-delete").click(function () {
                let that = $(this);
                system.config.servers.splice(that.attr("data-id"),1);
                system.saveConfig(false,true);
                ClientTable();

            })
        }
        function config_html(client_type,name,object,lid) {
            let config = "";
            config += `<dl class="dl-horizontal text-overflow dl-client-config">
<dt>Name</dt><dd><input type="text" class="form-control" name="name" value="${name}" /></dd>
<dt>Type</dt><dd><input class="form-control" name="client" value="${client_type}" disabled/></dd>
<dt>Host</dt><dd><input type="text" class="form-control" name="host" placeholder="The ip/hostname to connect to" required/></dd>
<dt>Port</dt><dd><input type="text" class="form-control" name="port" placeholder="The remote port" /></dd>
<dt>SSL</dt><dd><input type="checkbox" name="hostsecure" /> Check if the WebUI runs on SSL (http<strong>s</strong>://). Set the Port to 443!</dd>
<dt>Username</dt><dd><input type="text" class="form-control" name="login" placeholder="Login name of the WebUI" required/></dd>
<dt>Password</dt><dd><input type="password" class="form-control" name="password" placeholder="Password of the WebUI" /></dd>
<dt>WEB UI</dt><dd><input type="text" class="form-control" name="webui" placeholder="The link of WebUI" /></dd>
</dl>`;  // generalsettings

            let clientMap = {
                "ruTorrent WebUI" : `<dl class="dl-horizontal text-overflow dl-client-config">
<dt>Relative path</dt><dd><input type="text" name="ruTorrentrelativepath" class="form-control" /><br /><span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/some/path/to/webui</strong>&quot;/<br />Note: this folder should contain the "php" directory.</span></dd>
<dt>Label<br>(optional)</dt><dd><input type="text" name="rutorrentlabel" class="form-control" /><span class="tip">Default label to use for added torrents.</span></dd>
<dt>Directory<br>(optional)</dt><dd><input type="text" name="rutorrentdirectory" class="form-control" /><span class="tip">Default directory to store added torrents in. This should be an absolute path. It should be inside your default directory for torrents.</span></dd>
<dt>Add torrents paused?</dt><dd><input type="checkbox" name="rutorrentaddpaused" /></dd>
<!--
<dt>Label/Directory<br>(interactivity)</dt>
<dd>
<input type="checkbox" name="rutorrentdirlabelask" /><br />
						<span class="tip">Enable this to always ask for a label/directory combination upon adding torrents.</span>
						</dd>                  

<dt>Directory list <br> (optional)</dt>
<dd>
<div style="float: left"><select name="dirlist" multiple="multiple" size="5" style="min-width: 300px">
						</select></div>
						<div style="position:relative; float:left;"><button name="adddirbutton">+</button><br />
						<button name="deldirbutton">-</button></div><br style="clear:both;" />
						<span class="tip">Directories to use for adding torrents.</span></dd>      
						<dt>Labellist<br> (optional)</dt>
<dd>
<div style="float: left"><select name="labellist" multiple="multiple" size="5" style="min-width: 300px" style="float:left;">
						</select></div>
						<div style="position:relative; float:left;"><button name="addlabelbutton">+</button><br />
						<button name="dellabelbutton">-</button></div><br style="clear:both;" />
						<span class="tip">Labels to use for adding torrents.</span>
</dd>
-->
</dl>`,
                "Torrentflux WebUI" : `<dl class="dl-horizontal text-overflow dl-client-config">
<dt>Relative path</dt><dd><input type="text" name="torrentfluxrelativepath" class="form-control"/><span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/some/path/to/webui</strong>&quot;/<br />Note: this directory should contain the files "login.php"/"index.php"</span></dd>
</dl>`,
                "uTorrent WebUI" : `<dl class="dl-horizontal text-overflow dl-client-config">
<dt>Relative path<br />(optional)</dt><dd><input type="text" name="utorrentrelativepath" class="form-control"/><span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/gui/</strong>&quot;<br />Note: Unless you are doing reverse-proxying, this field should be left empty</span></dd>
</dl>`,
                "Deluge WebUI" : `<dl class="dl-horizontal text-overflow dl-client-config">
<dt>Relative path<br />(optional)</dt><dd><input type="text" name="delugerelativepath" class="form-control"/><span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/gui</strong>&quot;/<br />Note: Unless you are doing reverse-proxying, this field should be left empty</span></dd>
</dl>`,
                "Hadouken WebUI" : `<dl class="dl-horizontal text-overflow dl-client-config">
<dt>Token</dt><dd><input type="text" name="hadoukentoken" class="form-control"/><span class="tip">Mandatory. Enter this instead of Username/Password which will be ignored.<br />You can acquire it by clicking your username in the Hadouken WebUI, then API Keys and copying the text.</span></dd>
<dt>Label<br />(optional)</dt><dd><input type="text" name="hadoukenlabel" class="form-control"/><span class="tip"></span></dd>
<dt>Directory<br />(optional)</dt><dd><input type="text" name="hadoukendir" class="form-control"/><span class="tip"></span></dd>
</dl>`,
                "flood WebUI" : `<dl class="dl-horizontal text-overflow dl-client-config">
<dt>>Directory<br />(optional)</dt><dd><input type="text" name="flooddirectory" class="form-control"/>span class="tip">Default directory to store added torrents in. This should be an absolute path. It should be inside your default directory for torrents.</span></dd>
<dt>>Add torrents paused?</dt><dd><input type="checkbox" name="floodaddpaused" /></dd>
</dl>`,
                "QNAP DownloadStation" : `<dl class="dl-horizontal text-overflow dl-client-config">
<dt>Temp Directory</dt><dd><input type="text" name="qnaptemp" class="form-control" /><span class="tip">Directory used while downloading/seeding.</span></dd>
<dt>Destination Directory</dt><dd><input type="text" name="qnapmove" class="form-control"/><span class="tip">After torrent has completed it will be moved to this directory.</span></dd>
</dl>`,
                "qBittorrent WebUI" : `<dl class="dl-horizontal text-overflow dl-client-config">
<dt>>Relative path<br />(optional)</dt><dd><input type="text" name="utorrentrelativepath" class="form-control"/><span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/gui/</strong>&quot;<br />Note: Unless you are doing reverse-proxying, this field should be left empty</span></dd>
</dl>`
            };

            if(clientMap.hasOwnProperty(client_type)) {
                config += clientMap[client_type];
            }

            $("#server-modal > div.modal-dialog").html(  // 直接替换modal框信息
                `<div class="modal-content" id="server-add-modal-option">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">×</span><span class="sr-only">关闭</span></button>
                                <h4 class="modal-title">设置BT客户端属性</h4>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-12"  id="server-add-modal-option-context">${config}</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
                                <button type="button" class="btn btn-primary" id="btn-client-add-to-completed">完成</button>
                            </div>
                        </div>`
            );

            if(object) {
                for (let l in object) {
                    let that = $(`#server-modal > div.modal-dialog input[name='${l}']`);
                    that.attr("type")  === "checkbox" ? that.prop("checked",object[l]) : that.val(object[l]);
                }
            }

            $("#btn-client-add-to-completed").click(() => {
                let clientObj = {};

                clientObj["client"] = $("#server-add-modal-option input[name='client']").val();
                $("#server-add-modal-option input").each(function(){
                    let that = $(this);
                    clientObj[that.attr("name")] = that.attr("type") === "checkbox" ? that.prop("checked") : that.val();
                });
                if (lid) {
                    system.config.servers[lid] = clientObj;
                } else {
                    system.config.servers.push(clientObj);
                }
                system.saveConfig();
                ClientTable();
                $("button[data-dismiss=\"modal\"]").click();
            });
        }

        ClientTable();

        $("#server-add").click(() => {
            $("#server-modal > div.modal-dialog").html(`<div class="modal-content" id="server-add-modal-type">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">×</span><span class="sr-only">关闭</span></button>
                                <h4 class="modal-title">选择新建BT客户端类型</h4>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="input-group">
                                            <span class="input-group-addon"><i class="icon icon-server"></i></span>
                                            <input type="text" class="form-control" placeholder="BT客户端标签" id="tab_title">
                                        </div>
                                        <h2></h2>
                                        <select data-placeholder="请选择BT客户端类型" class="chosen-select form-control" id="tab_client">
                                            <option value=""></option>
                                            <option>Buffalo WebUI (OLD!)</option>
                                            <option>Deluge WebUI</option>
                                            <option>pyrt WebUI</option>
                                            <option>qBittorrent WebUI</option>
                                            <option>ruTorrent WebUI</option>
                                            <option>Torrentflux WebUI</option>
                                            <option>Transmission WebUI</option>
                                            <option>uTorrent WebUI</option>
                                            <option>Vuze SwingUI</option>
                                            <option>Vuze HTML WebUI</option>
                                            <option>Vuze Remote WebUI</option>
                                            <option>Tixati WebUI</option>
                                            <option>Hadouken WebUI</option>
                                            <option>NodeJS-rTorrent WebUI</option>
                                            <option>Synology WebUI</option>
                                            <option>flood WebUI</option>
                                            <option>QNAP DownloadStation</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
                                <button type="button" class="btn btn-primary" id="btn-client-add-to-option">下一步</button>
                            </div>
                        </div>`);

            $('select.chosen-select').chosen({
                no_results_text: '没有找到',    // 当检索时没有找到匹配项时显示的提示文本
                disable_search_threshold: 10, // 10 个以下的选择项则不显示检索框
                search_contains: true,         // 从任意位置开始检索
                width: "100%"
            });

            $("#btn-client-add-to-option").click(() => {
                // 获取用户在第一个窗口的输入值
                let name = $("#tab_title").val();
                let client_type = $("#tab_client").val();
                config_html(client_type,name);
            });

            $("#server-modal").modal();
        });
    };
    system.renderSite = () => {};
    system.renderOther = () =>  {
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
    };
    system.renderLog = () => {
        chrome.storage.sync.get({log: system.log},items => {
            const log_limit = 20;
            let show_log = system.log = items.log;

            show_log = show_log.reverse();
            if (system.log.length > log_limit) {  // 只显示最新的多少条日志，
                show_log = show_log.slice(0,log_limit);
            }

            $("#system-log").text(show_log.join("\n"));
        });
    };

    $(document).ready(function() {
        system.getConfig(() => { // 在插件后台配置页面渲染以及DOM监听方法（从左到右，从上到下）
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
        });
    });
})(jQuery);