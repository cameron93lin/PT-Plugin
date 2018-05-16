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
    system.renderPersonInfo = () => {
        let show_html = "<tr align='center'><td colspan='13'>No any Site Added</td></tr>";

        let user_info = system.getRecord();
        if (user_info) {
            let site_list = Array.from(new Set(user_info.map(dic => dic.site)));
            let site_data = site_list.map(site => {
                let rObj = user_info.filter(dic => dic.site === site).sort((a, b) => b.updateat - a.updateat)[0]; // 获取最新的信息
                let site_info = system.config.sites.filter(dic => dic.name === site)[0];   // 获取站点信息
                if (site_info) {
                    rObj["domain"] = site_info.domain;
                    rObj["enable"] = site_info.info;
                }
                return rObj;
            });
            show_html = site_data.reduce((a,b) => {
                return a += b.enable ? `<tr>
<td><img src="${b.domain}favicon.ico" width="16px" height="16px"><a href="${b.domain}" target="_blank">${b.site}</a></td>
<td>${b.uid}</td><td>${b.username}</td>
<td>${FileBytestoSize(b.uploaded)}</td><td>${FileBytestoSize(b.downloaded)}</td><td>${b.ratio}</td><td>${b.bonus}</td>
<td>${b.seedcount}</td><td>${FileBytestoSize(b.seedsize)}</td>
<td>${b.seedtime}</td><td>${b.leechtime}</td>
<td>${b.class}</td><td>${Date.create(b.updateat).toLocaleString()}</td>
</tr>` : ""
            }, "");
        }

        $("#overview-data").html(show_html);
    };
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
            });

            $(".server-delete").click(function () {
                let that = $(this);
                system.config.servers.splice(that.attr("data-id"),1);
                system.saveConfig(false,true);
                ClientTable();
            });
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

            $("#server-modal > div.modal-dialog").html(`<div class="modal-content" id="server-add-modal-option">
<div class="modal-header">
	<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">×</span><span class="sr-only">关闭</span></button>
	<h4 class="modal-title">设置BT客户端属性</h4>
</div>
<div class="modal-body">
	<div class="row">
		<div class="col-md-12" id="server-add-modal-option-context">${config}</div>
	</div>
</div>
<div class="modal-footer">
	<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
	<button type="button" class="btn btn-primary" id="btn-client-add-to-completed">完成</button>
</div>
</div>`);  // 直接替换modal框信息

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
	<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">×</span><span class="sr-only">关闭</span>
	</button>
	<h4 class="modal-title">选择新建BT客户端类型</h4>
</div>
<div class="modal-body">
	<div class="row">
		<div class="col-md-12">
			<div class="input-group"> <span class="input-group-addon"><i class="icon icon-server"></i></span>
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
</div></div>`);

            $('select.chosen-select').chosen({
                no_results_text: '没有找到',    // 当检索时没有找到匹配项时显示的提示文本
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
    system.renderSite = () => {
        if ($("#site-modal").length === 0) {
            $("body").append(`<div class="modal fade" id="site-modal"><div class="modal-dialog"></div></div>`);
        }

        function SiteTable() {
            let table = `<thead><tr><th>站点标签</th><th>域名</th><th>插件启用状况</th><th>动作</th></tr></thead>`;

            if (system.config.sites.length === 0) {
                table += `<tbody><tr align="center"><td colspan="4">No Sites Added</td></tr></tbody>`
            } else {
                let tr_list = system.config.sites.map((dic, index) => {
                    return `<tr>
<td><img src="${dic.domain}favicon.ico" width="16px" height="16px">${dic.name}</td>
<td>${dic.domain}</td>
<td>
<div class="switch switch-inline">
  <input type="checkbox" name="info" data-id="${index}" ${dic.info ? "checked" : ""}>
  <label>个人信息&nbsp;&nbsp;&nbsp;</label>
</div>
<div class="switch switch-inline">
  <input type="checkbox" name="rss" data-id="${index}" ${dic.rss ? "checked" : ""}>
  <label>RSS&nbsp;&nbsp;&nbsp;</label>
</div>
<div class="switch switch-inline" >
  <input type="checkbox" name="search" data-id="${index}" ${dic.search ? "checked" : ""}>
  <label>聚合搜索&nbsp;&nbsp;&nbsp;</label>
</div>
</div>
<div class="switch switch-inline">
  <input type="checkbox" name="signin" data-id="${index}" ${dic.signin ? "checked" : ""}>
  <label>签到&nbsp;&nbsp;&nbsp;</label>
</div>
</td>
<td>
<a href="${dic.domain}" target="_blank"><i class="icon icon-share"></i></a>
<a href="#" data-id="${index}" class="sites-edit"><i class="icon icon-edit"></i></a>
<a href="#" data-id="${index}" class="sites-delete"><i class="icon icon-remove-sign"></i></a>
</td></tr>`
                });
                table += `<tbody>${tr_list.join("")}</tbody>`;
            }

            $("#sites-list").html(table);

            $(".sites-edit").click(function () {
                let that = $(this);
                let config = system.config.sites[that.attr("data-id")];
                render_site_html(config);
                $("#site-modal").modal();
            });

            $("#sites-list input[type='checkbox']").click(function () {
                let that = $(this);
                system.config.sites[that.attr("data-id")][that.attr("name")] = that.prop("checked");
                system.saveConfig();
            });

            $(".sites-delete").click(function () {
                let that = $(this);
                chrome.storage.sync.set({config: system.config}); 
                system.removeRecord(system.config.sites[that.attr("data-id")].name);
                system.config.sites.splice(that.attr("data-id"), 1);
                system.saveConfig(false, true);
                SiteTable();
            });
        }

        SiteTable();

        let render_site_html = (config) => {
            let site_tr = dic => {
                dic = $.extend({link: "", enable: true, label: ""}, dic);
                return `<tr class="site-extension-info">
<td><div class="switch">
  <input type="checkbox" name="enable" ${dic.enable ? "checked" : ""}>
  <label>&nbsp;</label>
</div></td>
<td>
<div class="input-control">
  <input id="inputAccountExample2" type="text" class="form-control" name="label" value="${dic.label}">
</div>
</td>
<td><div class="input-control">
  <input id="inputAccountExample2" type="text" class="form-control" name="link" value="${dic.link}">
</div></td>
<td>
<a href="#" class="site-tr-remove"><i class="icon icon-remove-sign"></i></a>
</td>
</tr>`
            };

            let signin_parser = config.signin_parser || `$.get('${config.domain}')`;
            $("#site-modal > div.modal-dialog").html(`<div class="modal-content" id="site-modal-option">
<div class="modal-header">
	<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">×</span><span class="sr-only">关闭</span></button>
	<h4 class="modal-title">设置站点属性</h4>
</div>
<div class="modal-body">
	<div class="panel-group" id="accordionPanels" aria-multiselectable="true">
  <div class="panel panel-default">
    <div class="panel-heading" id="headingOne">
      <h4 class="panel-title">
        <a data-toggle="collapse" data-parent="#accordionPanels" href="#collapseOne">
          站点基本设置
        </a>
      </h4>
    </div>
    <div id="collapseOne" class="panel-collapse collapse in">
      <div class="panel-body"><dl class="dl-horizontal text-overflow dl-client-config">
<dt>站点标签</dt><dd><input type="text" class="form-control" name="name" value="${config.name}"><p>一个对你来说容易辨识站点的标签</p></dd>
<dt>域名</dt><dd><input class="form-control" name="domain" value="${config.domain}"><p>站点的域名，应该以http开头，并注意在最后由 '/'结束</p></dd>
<dt>基本模板</dt><dd><input class="form-control" name="template" value="${config.template}" disabled></dd>
</dl></div>
    </div>
  </div>
  <div class="panel panel-default">
    <div class="panel-heading" id="headingTwo">
      <h4 class="panel-title">
        <a class="collapsed" data-toggle="collapse" data-parent="#accordionPanels" href="#collapseTwo">
          站点信息获取方法
        </a>
      </h4>
    </div>
    <div id="collapseTwo" class="panel-collapse collapse">
      <div class="panel-body">
      <p>除非你是从DIY开始建立一个站点的解析方法，一般这个不需要做任何修改，直接略过就行</p>
      <textarea class="form-control" id="site-info-parser" rows="6"></textarea></div>
    </div>
  </div>
  <div class="panel panel-default">
    <div class="panel-heading" id="headingThree">
      <h4 class="panel-title">
        <a class="collapsed" data-toggle="collapse" data-parent="#accordionPanels" href="#collapseThree">
          站点RSS方法（新种聚合插件）
        </a>
      </h4>
    </div>
    <div id="collapseThree" class="panel-collapse collapse">
      <div class="panel-body">
      <p>你可以在这里设置多条RSS链接供新种聚合插件使用，请注意，RSS链接请使用下载链接以便于下载推送。另多条RSS链接订阅的种子请不要有交集以免订阅失败</p>
      <table class="table" id="site-rss">
      <thead>
      <tr>
      <th>启用</th>
      <th>标签名</th>
      <th>RSS链接</th>
      <th>删除</th>
      
</tr>
</thead>
      <tbody>
      ${config.rss_feed.map(dic => site_tr(dic)).join("")}
      <tr align="center"><td colspan="4"><a href="#" class="add-tr"><i class="icon icon-plus"></i></a></td></tr>
</tbody>
</table>
      </div>
    </div>
  </div>
  <div class="panel panel-default">
    <div class="panel-heading" id="headingFour">
      <h4 class="panel-title">
        <a class="collapsed" data-toggle="collapse" data-parent="#accordionPanels" href="#collapseFour">
          站点搜索方法（多站聚合搜索插件）
        </a>
      </h4>
    </div>
    <div id="collapseFour" class="panel-collapse collapse">
      <div class="panel-body">
<p>站点聚合搜索方法，供多站聚合搜索插件使用，你可以使用<code>$key$</code>作为搜索关键词的通用匹配式。</p>
<table class="table" id="site-advsearch">
      <thead>
      <tr>
      <th>启用</th>
      <th>标签名</th>
      <th>搜索链接</th>
      <th>删除</th>
      
</tr>
</thead>
      <tbody>
      ${config.search_list.map(dic => site_tr(dic)).join("")}
      <tr align="center"><td colspan="4"><a href="#" class="add-tr"><i class="icon icon-plus"></i></a></td></tr>
</tbody>
</table>
<hr>
<p>站点搜索页解析方法，除非你是从DIY新建或者已有解析方法不能满足使用，否则留空即可。</p>
<textarea class="form-control" id="site-search-parser" rows="6"></textarea>
</div>
    </div>
  </div>
  <div class="panel panel-default">
    <div class="panel-heading" id="headingFive">
      <h4 class="panel-title">
        <a class="collapsed" data-toggle="collapse" data-parent="#accordionPanels" href="#collapseFive">
          站点签到方法（批量签到插件）
        </a>
      </h4>
    </div>
    <div id="collapseFive" class="panel-collapse collapse">
      <div class="panel-body">
      暂不支持
      <textarea class="form-control" id="site-signin-parser" rows="6">${signin_parser}</textarea>
      </div>
    </div>
  </div>
</div>
</div>
<div class="modal-footer">
	<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
	<button type="button" class="btn btn-primary" id="btn-site-add-to-completed">完成</button>
</div>
</div>`);

            // 添加监听
            function removeListener() {
                $("a.site-tr-remove").click(function () {
                    let that = $(this);
                    that.parents("tr").remove();
                });
            }

            removeListener();

            $("a.add-tr").click(function () {
                let that = $(this);
                that.parents("tr").before(site_tr());
                removeListener();
            });

            $("#btn-site-add-to-completed").click(() => {
                config = $.extend(config, {
                    name: $("input[name='name']").val(),
                    domain: $("input[name='domain']").val(),
                    info_parser: $("#site-info-parser").val(),
                    search_parser: $("#site-search-parser").val(),
                    rss_feed: $("#site-rss > tbody > tr.site-extension-info").map(function () {
                        let that = $(this);
                        return {
                            enable: that.find("input[name='enable']").prop("checked"),
                            link: that.find("input[name='link']").val(),
                            label: that.find("input[name='label']").val()
                        };
                    }).get(),
                    search_list: $("#site-advsearch > tbody > tr.site-extension-info").map(function () {
                        let that = $(this);
                        return {
                            enable: that.find("input[name='enable']").prop("checked"),
                            link: that.find("input[name='link']").val(),
                            label: that.find("input[name='label']").val()
                        };
                    }).get(),
                });

                let exist_domain = system.config.sites.map(dic => dic.domain);
                let cid = exist_domain.indexOf(config.domain);

                if (cid > -1) {
                    system.config.sites[cid] = config;
                } else {
                    system.config.sites.push(config);
                }
                system.saveConfig();
                system.template[config.template](config).reflush(() => {
                    system.renderPersonInfo();
                });

                SiteTable();
                $("button[data-dismiss=\"modal\"]").click();
            });
        };

        $("#sites-add").click(() => {
            $("#site-modal > div.modal-dialog").html(() => {
                let all_default_template = [];
                for (let t in  system.template) {
                    all_default_template.push(system.template[t]().config);
                }

                function f_click(l) {
                    return l.map(i => `<label class="radio-inline"><input type="radio" name="radio-sites" value="${i}"> ${i}</label>`).join("");
                }

                return `<div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">×</span><span class="sr-only">关闭</span></button>
                                <h4 class="modal-title">选择新建站点类型</h4>
                            </div>
                            <div class="modal-body">
                            <table class="table table-site">
                            <thead>
                            <tr>
                            <th>类型</th>
                                                <th>站点模板</th>
</tr>
                            <tbody>
                            <tr><td>解析模板</td><td id="site-add-template">${f_click(all_default_template.filter(dic => dic.type === "template").map(dic => dic.template))}</td></tr>
                            <tr><td>教育网站点</td><td id="site-add-cernet">${f_click(all_default_template.filter(dic => dic.type === "cernet").map(dic => dic.template))}</td></tr>
                            <tr><td>公网</td><td id="site-add-china">${f_click(all_default_template.filter(dic => dic.type === "china").map(dic => dic.template))}</td></tr>
                            <tr><td>国外站点</td><td id="site-add-foreign">${f_click(all_default_template.filter(dic => dic.type === "foreign").map(dic => dic.template))}</td></tr>
                            <tr><td>BT站点</td><td id="site-add-bt">${f_click(all_default_template.filter(dic => dic.type === "bt").map(dic => dic.template))}</td></tr>
</tbody>
</table>
                              
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
                                <button type="button" class="btn btn-primary" id="btn-site-add-to-option">下一步</button>
                            </div>
                        </div>`
            });

            $("#btn-site-add-to-option").click(() => {
                // 获取用户在第一个窗口的输入值
                let selected_template = $("input[name='radio-sites']:checked").val();
                if (selected_template !== undefined) {
                    let def_config = system.template[selected_template]().config;
                    render_site_html(def_config);
                }
            });
            $("#site-modal").modal();
        })
    };
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

    system.flushall = () => {
        var intervalId = 1;
        for (let site in system.config.sites){
            system.template[system.config.sites[site].template](system.config.sites[site]).reflush();
        }
        intervalId = setInterval(
                        function(){
                            if (system.reflushconter >= system.config.sites.length){
                                system.renderPersonInfo();
                                clearInterval(intervalId);
                            }
                        }, 1000);
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
        let flushbtn = $("#overview-flush");
        flushbtn.click(() => {
                system.flushall();
        });
    });
})(jQuery);