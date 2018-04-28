/*  定义基本模板 */


class DIY {
    constructor(config) {
        this.config = $.extend({
            "name": "示例站点",   // 站点名称（对个人来说容易识别就行）
            "domain": "https://pt.nexusphp.com/",  // 站点域名（唯一）
            "type": "template",   // 站点类型 template, cernet, china, foreign, bt   (依次为底层模板、教育网站点、公网站点、外站、BT站点
            "template": "NexusPHP", // 站点解析模板， 应该在以下值中选取 DIY, NexusPHP, BYR , NPU, ZX ,TTG, HDChina, HDCity, HDStreet, CCFBits.....
            "info": true,  // 脚本获取用户信息（对PT站点均应启用）
            "info_page": "https://pt.nexusphp.com/userdetails.php?id=$id$",  // 用户信息页（脚本会读取该页面以获取用户的个人信息）
            "info_parser": "",  // 用户信息页解析方法
            "info_data": {
                "id": 1,  // 用户ID
                "username": "Admin",  // 用户名
                "record": [
                    {
                        "uploaded": "",  // 上传量
                        "downloaded": "",  // 下载量
                        "ratio": "",     // 分享率
                        "class": "",    // 用户等级
                        "seedtime": "",  // 做种时间
                        "seedcount": "", // 做种数量  （例如需要从getusertorrentlistajax.php?userid=$id$&type=seeding）中获取（NexusPHP）
                        "seedsize": "", // 做种体积   （例如需要从getusertorrentlistajax.php?userid=$id$&type=seeding）中获取（NexusPHP）
                        "leechtime": "",  // 下载时间
                        "updateat": "",  // 更新时间（以timestamp形式）
                    }
                ],
                "last_update": ""  // 最后更新时间（以timestamp形式）
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
                    "link": "",   // 搜索链接   可以使用的统配符有 $key$
                    "enable": true,  // 该搜索链接启用状态
                    "label": ""  // 标签，未设置时为站点名称（可以使用html代码，例如 `<span class="label">示例标签</span>`）
                }
            ]
        },config);
    };

    search(key) {};
    reflush() {};
    getConfig() {return this.config};
}

system.template.DIY = DIY;

class NexusPHP extends DIY {

    
}



//system.template.NexusPHP = NexusPHP;

//let NexusPHP = Object.create(DIY);
//NexusPHP.config = $.extend(NexusPHP.config,{"template": "NexusPHP"});

//system.template.NexusPHP = NexusPHP;

//let BYR = Object.create(NexusPHP);
//BYR.config = $.extend(BYR.config,{"name":"BYR"});

//system.template.BYR = BYR;


