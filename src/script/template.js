/*  定义基本模板 */
system.template.DIY = conf => {
    this.config = $.extend({  // 默认配置
        "name": "示例站点",   // 站点名称（对个人来说容易识别就行）
        "domain": "https://pt.nexusphp.com/",  // 站点域名（唯一）
        "type": "template",   // 站点类型 template, cernet, china, foreign, bt   (依次为底层模板、教育网站点、公网站点、外站、BT站点
        "template": "DIY", // 站点解析模板， 应与在template中注册的名称相同。例如 DIY, NexusPHP, BYR , NPU, ZX ,TTG, HDChina, HDCity, HDStreet, CCFBits.....
        "info": true,  // 脚本获取用户信息（对PT站点均应启用）
        "info_data": {},  // 存放用户信息（例如id之类的东西），请注意：记录信息请直接存放在system.config.info_record中，而不是这里
        "info_parser": "",  // 用户信息页解析方法（完整）
        "rss": true,  // RSSBoard插件启用状态（站点全局）
        "rss_feed": [
            {
                "link": "",  // RSS链接
                "enable": true,  // 启用状态（单独）
                "label": ""  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ],
        "search": true,  // Search 插件启用状态（站点全局）
        "search_parser" : "console.log('DIY')",  // 搜索页面解析方法
        "search_list": [
            {
                "link": "",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": ""  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]
    },conf);

    // 搜索方法底层
    this.search_parser = (xhr,doc,body,page) => {
        let search_result = [];
        eval(config.search_parser);
        return search_result
    };

    // 搜索
    this.search = key => {
        if (config.search) {  // 站点启用搜索功能
            for (let i = 0; i < config.search_list.length; i++) {
                let item = config.search_list[i];
                if (item.enable) {
                    let xhr = new XMLHttpRequest();
                    xhr.open("GET", item.link.replace(/\$key\$/ig, key), true);
                    xhr.onload = function () {
                        if (/(login|verify|returnto)[.=]/.test(xhr.responseURL)) {
                            // TODO 没有登陆
                        } else {
                            let parser = html_parser(xhr.responseText);  // 使用定义好的html_parser解析页面
                            try {
                                let search_result = search_parser(item, xhr, parser.doc, parser.body, parser.page);
                                // TODO 向表格中添加搜索结果
                                console.log(search_result);
                            } catch (e) {
                                console.log(e)
                            }

                        }
                    };
                    xhr.send(null);
                }
            }
        }
    };

    // 个人信息刷新方法
    this.reflush = () => {
        if (config.info) {
            eval(config.info_parser);
        }
    };

    // config保存
    this.saveConfig = () => {
        // 判断重复与否
        let domain_list = system.config.sites.map(dic => dic.domain);
        let domain_id = domain_list.indexOf(config.domain);
        if (domain_id > -1) { // 已有重复站点
            system.config.sites[domain_id] = config;
        } else {
            system.config.sites.push(config);
        }

        system.saveConfig(false,true);
    };

    return this
};

system.template.NexusPHP = conf => {
    system.template.DIY.apply(this);
    this.config = $.extend(this.config,{"template": "NexusPHP"},conf);
    this.torrent_table_selector = "table.torrents:last > tbody > tr:gt(0)";
    this.selector_info_block = "#info_block";
    this.selector_bonus = "tr:contains('魔力值')";

    this.search_parser = (item, xhr, doc, body, page) => {
        let search_label = item.label || config.name;
        console.log(xhr, doc, body, page);
        let search_result = [];
        let url_prefix = /pt\.whu\.edu\.cn|whupt\.net|hudbt\.hust\.edu\.cn/.test(xhr.responseURL) ? "" : (xhr.responseURL.match(/(https?:\/\/[^\/]+?\/).+/) || ['', ''])[1];
        console.log("Using The normal parser for NexusPHP in Site: " + search_label);
        if (/没有种子|No [Tt]orrents?|Your search did not match anything|用准确的关键字重试/.test(xhr.responseText)) {
            console.log("No any torrent find in Site " + search_label + ".");
            return;
        }
        let tr_list = page.find(torrent_table_selector);
        console.log("Get " + tr_list.length + " records in Site " + search_label + ".");
        for (let i = 0; i < tr_list.length; i++) {
            let torrent_data_raw = tr_list.eq(i);
            let _tag_name = torrent_data_raw.find("a[href*='hit']").first();

            // 确定日期tag，因用户在站点设置中配置及站点优惠信息的情况的存在，此处dom结构会有不同
            // 此外多数站点对于 seeders, leechers, completed 没有额外的定位信息，故要依赖于正确的日期tag
            let _tag_date, _date = "0000-00-00 00:00:00";
            _tag_date = torrent_data_raw.find("> td").filter(function () {
                return /(\d{4}-\d{2}-\d{2}[^\d]+?\d{2}:\d{2}:\d{2})|[分时天月年]/.test($(this).html());
            }).last();
            if (_tag_date && _tag_date.html()) {
                _date = (_tag_date.html().match(time_regex) || ["0000-00-00 00:00:00"])[0].replace(time_regen_replace, "-$1 $2:");
            }

            let _tag_size = _tag_date.next("td");
            let _tag_seeders = _tag_size.next("td");  // torrent_data_raw.find("a[href$='#seeders']")
            let _tag_leechers = _tag_seeders.next("td");  // torrent_data_raw.find("a[href$='#leechers']")
            let _tag_completed = _tag_leechers.next("td");  // torrent_data_raw.find("a[href^='viewsnatches']")

            search_result.push({
                "site": search_label,
                "name": _tag_name.attr("title") || _tag_name.text(),
                "link": url_prefix + _tag_name.attr("href"),
                "pubdate": Date.parse(_date),
                "size": FileSizetoBytes(_tag_size.text()),
                "seeders": _tag_seeders.text().replace(',', '') || 0,  // 获取不到正常信息的时候置0
                "leechers": _tag_leechers.text().replace(',', '') || 0,
                "completed": _tag_completed.text().replace(',', '') || 0
            });
        }
        return search_result;
    };

    this.reflush = () => {
        reflush_nexusphp = () => {
            let uid = config.info_data.id;
            let rObj = {site:config.name,uid:uid};
            $.ajax({
                type: "get",
                url: `${config.domain}userdetails.php?id=${uid}`,
                async: false,
                success: data => {  // 解析个人信息页面
                    let parser = html_parser(data);
                    let info_block = parser.page.find(selector_info_block);
                    rObj["username"] = info_block.find("a[href^='userdetails.php']").first().text().trim();

                    let up_dl_ratio_block = parser.page.find("td.rowfollow:contains('分享率')");
                    let up_dl_ratio_group = up_dl_ratio_block.text().match(/分享率.+?([\d.]+).+上传量.+?([\d.]+ [TGMK]?i?B).+下载量.+?([\d.]+ [TGMK]?i?B)/);

                    rObj["bonus"] = parser.page.find(selector_bonus).last().text().match(/[\d.]+/)[0];
                    rObj["uploaded"] = FileSizetoBytes(up_dl_ratio_group[2]);
                    rObj["downloaded"] = FileSizetoBytes(up_dl_ratio_group[3]);
                    rObj["ratio"] = up_dl_ratio_group[1];
                    rObj["class"] = info_block.find("a[href^='userdetails.php']").attr("class").match(/(.+?)_Name/)[1];

                    let seed_info_block = parser.page.find("td.rowfollow:contains('做种时间')");
                    let seed_info_group = seed_info_block.text().match(/做种时间.+?([\d天:]+).+?下载时间.+?([\d天:]+)/);
                    rObj["seedtime"] = seed_info_group[1];
                    rObj["leechtime"] = seed_info_group[2];
                }
            });
            $.ajax({
                type: "get",
                url: `${config.domain}getusertorrentlistajax.php?userid=${uid}&type=seeding`,
                async: false,
                dataType: "text",
                success: data => { // 解析用户保种信息
                    let parser = html_parser(data);
                    let tr_list = parser.page.find("table tr:gt(0)");
                    rObj["seedcount"] = tr_list.length;
                    let seedsize = 0;
                    for (let i=0;i<tr_list.length;i++) {
                        let tr = tr_list.eq(i);
                        let size_td = tr.find("td:eq(2)");
                        seedsize += FileSizetoBytes(size_td.text().match(/([\d.]+)[^TGMK].?([TGMK]?i?B)/)[0]);
                    }
                    rObj["seedsize"] = seedsize;

                }
            });
            rObj["updateat"] = Date.now();

            system.config.info_record.push(rObj);
            system.saveConfig(false,true);
        };

        if(!config.info_data.id) {  // 不存在用户id信息
            $.ajax({
                type: "get",
                url: config.domain,
                success: data => {
                    let parser = html_parser(data);
                    let user_tag = parser.page.find(selector_info_block + " a[href*='userdetails.php']");
                    config.info_data.id = user_tag.attr("href").match(/\d+/)[0];
                    saveConfig();
                    reflush_nexusphp();
                }
            })
        } else {
            reflush_nexusphp();
        }
    };

    return this
};

system.template.BYR = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config,{
        name:"BYR",
        domain:"https://bt.byr.cn/",
        type: "cernet",
        template: "BYR",
        search_list:[
            {
                "link": "https://bt.byr.cn/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "BYR"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]},conf);
    return this
};

system.template.WHUPT = conf => {
    system.template.NexusPHP.apply(this);
    this.selector_info_block = "#header-info";
    this.config = $.extend(this.config,{
        name:"WHUPT",
        domain:"https://pt.whu.edu.cn/",
        type: "cernet",
        template: "WHUPT",
        search_list:[
            {
                "link": "https://pt.whu.edu.cn/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "WHUPT"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]},conf);
    return this
};

system.template.TJUPT = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config,{
        name:"TJUPT",
        domain:"https://tjupt.org/",
        type: "cernet",
        template: "TJUPT",
        search_list:[
            {
                "link": "https://tjupt.org/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "TJUPT"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]},conf);
    return this
};

system.template.MTPT = conf => {
    system.template.NexusPHP.apply(this);
    this.selector_bonus = "tr:contains('麦粒')";
    this.config = $.extend(this.config,{
        name:"MTPT",
        domain:"https://pt.nwsuaf6.edu.cn/",
        type: "cernet",
        template: "MTPT",
        search_list:[
            {
                "link": "https://pt.nwsuaf6.edu.cn/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "MTPT"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]},conf);
    return this
};

for(let t in system.template) {
    //console.log(t,system.template[t]().config)
}

