/*  定义基本模板 */
system.template.DIY = config => {
    this.config = $.extend({
        "name": "示例站点",   // 站点名称（对个人来说容易识别就行）
        "domain": "https://pt.nexusphp.com/",  // 站点域名（唯一）
        "type": "template",   // 站点类型 template, cernet, china, foreign, bt   (依次为底层模板、教育网站点、公网站点、外站、BT站点
        "template": "DIY", // 站点解析模板， 应该在以下值中选取 DIY, NexusPHP, BYR , NPU, ZX ,TTG, HDChina, HDCity, HDStreet, CCFBits.....
        "info": true,  // 脚本获取用户信息（对PT站点均应启用）
        "info_page": "",  // 用户信息页（脚本会读取该页面以获取用户的个人信息，如果需要读取多个页面，请在解析方法中定义）
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
        "search_parser" : "",  // 搜索页面解析方法
        "search_list": [
            {
                "link": "",   // 搜索链接   可以使用的统配符有 $key$
                "enable": true,  // 该搜索链接启用状态
                "label": ""  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
            }
        ]
    },config);

    // 搜索方法
    this.search = key => {

    };

    // 个人信息刷新方法
    this.reflush = () => {

    };

    return this
};

system.template.NexusPHP = config => {
    system.template.DIY.apply(this);
    let conf = this.config = $.extend(this.config,{"template": "NexusPHP"},config);

    this.search = key => {
        if (this.config.search) {  // 站点启用搜索功能
            for (let i=0;i< this.config.search_list;i++) {
                let item = this.config.search_list[i];
                if (item.enable) {
                    let xhr = new XMLHttpRequest();
                    xhr.open("GET",item.link.replace(/\$key\$/ig,key),true);
                    xhr.onload = function () {
                        if (/(login|verify|returnto)[.=]/.test(xhr.responseURL)){
                            // TODO 没有登陆
                        } else {
                            let parser = html_parser(xhr.responseText);  // 使用定义好的html_parser解析页面
                            eval(conf.search_parser);
                        }
                    }
                }
            }
        }

    };

    return this
};

system.template.BYR = config => {
    system.template.NexusPHP.apply(this);
    this.config = $.extend(this.config,{name:"BYR",domain:"https://bt.byr.cn"},config);
    return this
};


for(let t in system.template) {
    console.log(t,system.template[t]().config)
}

