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
        ],
        "signin": true,   // 自动签到插件启用状态（站点全局）
        "signin_parser": "",   // 签到方法（完整）
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
                    makeRequest("GET", item.link.replace(/\$key\$/ig, key)).then(parser => {
                        if (/(login|verify|returnto)[.=]/.test(parser.xhr.responseURL)) {
                            // TODO 没有登陆
                        } else {
                            try {
                                let search_result = search_parser(item, parser.xhr, parser.doc, parser.body, parser.page);
                                // TODO 向表格中添加搜索结果
                                console.log(search_result);
                            } catch (e) {
                                console.log(e)
                            }
                        }
                    });
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

    this.signin = () => {
        if (config.signin) {
            eval(config.signin_parser);
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
    this.link_userdetails_f = () => `${config.domain}userdetails.php?id=${config.info_data.id}`;
    this.link_usertorrentlist_f = () => `${config.domain}getusertorrentlistajax.php?userid=${config.info_data.id}&type=seeding`;
    this.selector_torrent_table = "table.torrents:last > tbody > tr:gt(0)";
    this.selector_info_block = "#info_block";
    this.selector_username_in_info_block = "a[href*='userdetails.php']";
    this.selector_user_level = "[class$='_Name']";
    this.selector_bonus = "tr:contains('魔力')";
    this.selector_time = "td.rowfollow:contains('做种时间')";

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
        let tr_list = page.find(selector_torrent_table);
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

    this.reflush_nexusphp = () => {
        let rObj = {site: config.name, uid: config.info_data.id};
        let get_userdetails = makeRequest("GET", link_userdetails_f()).then(parser => {
            let info_block = parser.page.find(selector_info_block);
            rObj["username"] = info_block.find(selector_username_in_info_block).first().text().trim();
            rObj["bonus"] = parser.page.find(selector_bonus).last().text().match(/[\d.,]+/)[0];
            rObj["class"] = info_block.find(selector_user_level).attr("class").match(/(.+?)_Name/)[1];

            let up_dl_ratio_block = parser.page.find("td.rowfollow:contains('分享率')");
            let up_dl_ratio_group = up_dl_ratio_block.text().replace(/\n/ig, " ").replace(/,/ig, "")
                .match(/分享率.+?([\d.]+|无限).+?上[传傳]量.+?([\d.]+ [TGMK]?i?B).+?下[载載]量.+?([\d.]+ [TGMK]?i?B)/);
            if (up_dl_ratio_group) {
                rObj["ratio"] = up_dl_ratio_group[1];
                rObj["uploaded"] = FileSizetoBytes(up_dl_ratio_group[2]);
                rObj["downloaded"] = FileSizetoBytes(up_dl_ratio_group[3]);
            } else {
                let info_block_text = info_block.text().replace(/\n/ig, " ");
                rObj["ratio"] = info_block_text.match(/分享率.+?([\d.]+|无限)/)[1];
                rObj["uploaded"] = FileSizetoBytes(info_block_text.match(/上[传傳]量.+?([\d.]+ [TGMK]?i?B)/)[1]);
                rObj["downloaded"] = FileSizetoBytes(info_block_text.match(/下[载載]量.+?([\d.]+ [TGMK]?i?B)/)[1]);
            }

            let seed_info_block = parser.page.find(selector_time);
            let seed_info_group = seed_info_block.text().match(/(做种时间|做種時間).+?([\d天:]+).+?(下载时间|下載時間).+?([\d天:]+)/);
            if (seed_info_group) {
                rObj["seedtime"] = seed_info_group[2];
                rObj["leechtime"] = seed_info_group[4];
            }
        });
        let get_usertorrentlist = makeRequest("GET", link_usertorrentlist_f()).then(parser => {
            let tr_list = parser.page.find("> table > tbody > tr:gt(0)");
            rObj["seedcount"] = tr_list.length;
            let seedsize = 0;
            for (let i = 0; i < tr_list.length; i++) {
                let tr = tr_list.eq(i);
                let size_td = tr.find("> td:eq(2)");
                seedsize += FileSizetoBytes(size_td.text().match(/([\d.]+)[^TGMK].?([TGMK]?i?B)/)[0]);
            }
            rObj["seedsize"] = seedsize;
        });
        Promise.all([get_userdetails, get_usertorrentlist]).then(() => {
            rObj["updateat"] = Date.now();
            system.saveRecord(rObj);
        });
    };

    this.reflush = (callback) => {
        if(!config.info_data.id) {  // 不存在用户id信息
            makeRequest("GET", config.domain).then(parser => {
                let user_tag = parser.page.find(`${selector_info_block} ${selector_username_in_info_block}`);
                config.info_data.id = user_tag.attr("href").match(/\d+/)[0];
                saveConfig();
                reflush_nexusphp();
            });
        } else {
            reflush_nexusphp();
        }
        if (typeof callback === "function") {
            callback();
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

system.template.XAUAT6 = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "XAUAT6",
        domain: "http://pt.xauat6.edu.cn/",
        type: "cernet",
        template: "XAUAT6",
        search_list: [
            {
                "link": "http://pt.xauat6.edu.cn/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "XAUAT6"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]
    }, conf);
    return this
};

system.template.NYPT = conf => {
    system.template.NexusPHP.apply(this);
    this.selector_bonus = "tr:contains('魔力豆')";
    this.config = $.extend(this.config, {
        name: "NYPT",
        domain: "https://nanyangpt.com/",
        type: "cernet",
        template: "NYPT",
        search_list: [
            {
                "link": "https://nanyangpt.com/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "NYPT"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]
    }, conf);
    return this
};

system.template.SJTU = conf => {
    system.template.NexusPHP.apply(this);
    this.selector_info_block = "#userbar";
    this.link_usertorrentlist_f = () => `${config.domain}viewusertorrents.php?id=${config.info_data.id}&show=seeding`;
    this.config = $.extend(this.config, {
        name: "SJTU",
        domain: "https://pt.sjtu.edu.cn/",
        type: "cernet",
        template: "SJTU",
        search_list: [
            {
                "link": "https://pt.sjtu.edu.cn/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "SJTU"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]
    }, conf);
    return this
};

system.template.HUDBT = conf => {
    system.template.NexusPHP.apply(this);
    this.selector_info_block = "#header-userinfo";
    this.config = $.extend(this.config, {
        name: "HUDBT",
        domain: "https://hudbt.hust.edu.cn/",
        type: "cernet",
        template: "HUDBT",
        search_list: [
            {
                "link": "https://hudbt.hust.edu.cn/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "HUDBT"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]
    }, conf);
    return this
};

system.template.HDSKY = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "HDSKY",
        domain: "https://hdsky.me/",
        type: "china",
        template: "HDSKY",
        search_list: [
            {
                "link": "https://hdsky.me/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "HDSKY"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]
    }, conf);
    return this
};

system.template.Hyperay = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "Hyperay",
        domain: "https://www.hyperay.org/",
        type: "china",
        template: "Hyperay",
        search_list: [
            {
                "link": "https://www.hyperay.org/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "Hyperay"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]
    }, conf);
    return this
};

system.template.HDHome = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "HDHome",
        domain: "https://hdhome.org/",
        type: "china",
        template: "HDHome",
        search_list: [
            {
                "link": "https://hdhome.org/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "HDHome"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
            {
                "link": "https://hdhome.org/live.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "HDHome(Live)"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]
    }, conf);
    return this
};

system.template.HDTime = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "HDTime",
        domain: "https://hdtime.org/",
        type: "china",
        template: "HDTime",
        search_list: [
            {
                "link": "https://hdtime.org/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "HDTime"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

system.template.HDU = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "HDU",
        domain: "https://pt.hdupt.com/",
        type: "china",
        template: "HDU",
        search_list: [
            {
                "link": "https://pt.hdupt.com/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "HDU"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

system.template.JoyHD = conf => {
    system.template.NexusPHP.apply(this);
    this.selector_bonus = "tr:contains('银元')";
    this.config = $.extend(this.config, {
        name: "JoyHD",
        domain: "https://www.joyhd.net/",
        type: "china",
        template: "JoyHD",
        search_list: [
            {
                "link": "https://www.joyhd.net/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "JoyHD"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

system.template.CHDBits = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "CHDBits",
        domain: "https://chdbits.co/",
        type: "china",
        template: "CHDBits",
        search_list: [
            {
                "link": "https://chdbits.co/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "CHDBits"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

system.template.Ourbits = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "Ourbits",
        domain: "https://ourbits.club/",
        type: "china",
        template: "Ourbits",
        search_list: [
            {
                "link": "https://ourbits.club/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "Ourbits"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

system.template.OpenCD = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "OpenCD",
        domain: "https://open.cd/",
        type: "china",
        template: "OpenCD",
        search_list: [
            {
                "link": "https://open.cd/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "OpenCD"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

system.template.KeepFrds = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "KeepFrds",
        domain: "https://pt.keepfrds.com/",
        type: "china",
        template: "KeepFrds",
        search_list: [
            {
                "link": "https://pt.keepfrds.com/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "KeepFrds"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

// TODO Test...........
system.template.TCCF = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "TCCF",
        domain: "https://et8.org/",
        type: "china",
        template: "TCCF",
        search_list: [
            {
                "link": "https://et8.org/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "TCCF"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

system.template.U2 = conf => {
    system.template.NexusPHP.apply(this);
    this.selector_bonus = "tr:contains('UCoin')";
    this.config = $.extend(this.config, {
        name: "U2",
        domain: "https://u2.dmhy.org/",
        type: "china",
        template: "U2",
        search_list: [
            {
                "link": "https://u2.dmhy.org/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "U2"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

system.template.CMCT = conf => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config, {
        name: "CMCT",
        domain: "https://hdcmct.org/",
        type: "china",
        template: "CMCT",
        search_list: [
            {
                "link": "https://hdcmct.org/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "CMCT"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

// TODO MT的做种信息
system.template.MTeam = conf => {
    system.template.NexusPHP.apply(this);
    this.selector_time = "td.rowfollow:contains('做種時間')";
    this.config = $.extend(this.config, {
        name: "MTeam",
        domain: "https://tp.m-team.cc/",
        type: "china",
        template: "MTeam",
        search_list: [
            {
                "link": "https://tp.m-team.cc/torrents.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "MTeam"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
            {
                "link": "https://tp.m-team.cc/adult.php?search=$key$",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": "MTeam(Adult)"  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            },
        ]
    }, conf);
    return this
};

/*
for(let t in system.template) {
    system.template[t]().reflush();
    //console.log(t,system.template[t]().config)
}

*/