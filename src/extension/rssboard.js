(function($) {
    let RSSBoard = {
        html: `<div id="tab-extension-rssboard" class="top-nav">
    <h1 class="page-header">新种聚合（RSS聚合）</h1>
    <p class="hl-green">通过解析各站的RSS链接，来下载或展示各站资源的最新情况。</p>
    <div class="row">
        <div class="col-md-12">
            <p class="text-right">最后更新于： <span id="rssboard_last_update" data-timestamp="0"></span>
                <a href="#" id="rssboard-flush" title="强制刷新"><i class="icon icon-repeat"></i></a>
            </p>
            <div id="datagridExample" class="datagrid">
                <div class="datagrid-container datagrid-striped"></div>
                <div class="pager"></div>
            </div>
        </div>
    </div>
</div>`,  // 插件渲染使用的HTML模板

        // 自定义插件方法
        cached_item: [],  // 定义缓存列表以避免重复添加

        flushFeed() {
            let myDataGrid = $('#datagridExample').data('zui.datagrid');
            RSSBoard.cached_item = []; // 清空缓存列表
            myDataGrid.dataSource.array = [];
            myDataGrid.dataSource.data = null;
            myDataGrid.render();  // 清空表格

            if (system.config.sites.length === 0 ){
                system.showErrorMessage("看起来并没有添加任何站点");
                return;
            }  // 未添加站点时显示

            system.showMessage("正在从RSS源加载数据.........");
            for (let i=0;i<system.config.sites.length;i++) {  // 从system中获取所有rss_link并遍历
                let site = system.config.sites[i];
                let rss_feed = site.rss_feed;
                for (let j=0;j<rss_feed.length;j++) {
                    let rss = rss_feed[j];
                    let parser = new RSSParser();
                    if (rss.link && ((rss.enable || (rss.enable = false)) === true)) {
                        parser.parseURL(rss.link,function (err,feed) {
                            let item_list = feed.items.map(dic => {
                                if (RSSBoard.cached_item.indexOf(dic.link) === -1) {
                                    RSSBoard.cached_item.push(dic.link);

                                    let rObj = {};
                                    rObj["site"] = rss.label ? rss.label : site.name;  // 如果用户不定义label，则label值为站点名
                                    rObj["title"] = dic.title;  // 种子名
                                    rObj["release"] = dic.pubDate;  // 种子发布时间
                                    /* 种子下载链接
                                     * NexusPHP系的链接在 dic.enclosure.url 中给出
                                     * 部分站点的RSS Feed中并没有给出链接，而是直接以dic.link的形式，请在后面修改rObj.link为正确的种子页信息
                                     *  */
                                    rObj["link"] =  dic.link;  // 种子详情页
                                    rObj["torrent"] = dic.enclosure ? dic.enclosure.url : dic.link;  // 种子

                                    // TODO 根据不同站点的RSS Feeds信息进行修改（请根据用户反馈修改）
                                    if (/ccfbits\.org/.test(rss.link)) {
                                        let tid = dic.link.match(/feeddownload\.php\/(\d+)/)[1];
                                        rObj["link"] = `http://ccfbits.org/details.php?id=${tid}`;
                                        rObj["release"] = dic.content.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)[0] + " +0000";
                                    }  // CCFBits

                                    rObj["release"] = Date.parse(rObj["release"]);
                                    return rObj;
                                } else {
                                    return null;
                                }
                            }).filter(dic => !isEmpty(dic));

                            // 更新数据表格
                            myDataGrid.dataSource.array = myDataGrid.dataSource.array.concat(item_list);
                            myDataGrid.dataSource.data = null;
                            myDataGrid.render();

                            // 更新最后更新时间
                            let update_tag = $("#rssboard_last_update");
                            let now_timestamp = Date.now();
                            if (now_timestamp > update_tag.attr("data-timestamp")) {
                                update_tag.attr("data-timestamp",now_timestamp);
                                update_tag.text(Date(now_timestamp).toLocaleString());
                            }

                        })
                    }

                }

            }
        },  // 用来从RSS FEED中获取信息并整理到表格中

        init() {
            // 注册DOM元素
            $("#extension").append($(RSSBoard.html).hide());

            let datagrid = $('#datagridExample');
            let flushbtn = $("#rssboard-flush");

            datagrid.datagrid({
                dataSource: {
                    cols:[
                        {
                            name: 'site',
                            label: '站点标签',
                            width: 0.1,
                            html:true,
                            className:"text-center"
                        },
                        {
                            name: 'title',
                            label: '种子信息',
                            width: 0.8,
                            sort:false,
                            className:"text-ellipsis",
                            html:true,
                            valueOperator:{
                                getter: function (dataValue,cell,dataGrid) {
                                    return `<a href="${cell.config.data.link}" target="_blank" rel="noreferer nofollow" title="${cell.config.data.title}">${cell.config.data.title}</a>`;
                                }
                            }},
                        {
                            name: 'release',
                            label: '发布时间',
                            width: 0.2,
                            className:"text-center",
                            valueType: "date"
                        },
                        {
                            name: 'torrent',
                            label: '动作',
                            width: 0.1,
                            className:"text-center",
                            html:true,
                            sort:false,
                            valueOperator: {
                                getter: function(dataValue, cell, dataGrid) {
                                    return `<a title=\"下载种子\" href="${dataValue}"><i class="icon icon-arrow-down"></i></a> &nbsp; <a title=\"推送到默认远程服务器\" data-url="${dataValue}" href="#"><i class="icon icon-share-alt"></i></a>`;
                                }
                            }
                        }
                    ],
                    array: []
                },
                states: {
                    sortBy: 'release',
                    order: "desc",
                    pager: {
                        page: 1,
                        recPerPage: 100
                    }
                },
                sortable: true,
                checkable: true,
                checkByClickRow: false,
                height: 'page',
                onLoad: function (result) {  // 在初始化的时候设置事件回调函数
                    // TODO 给所有推送按钮添加click方法
                }
            });

            system.loadScript("static/lib/rssparser/rss-parser.min.js",function() {
                flushbtn.click(() => {
                    RSSBoard.flushFeed();
                });

                flushbtn.click();  // 进入后自动点击以获取RSS源数据

                // setInterval(() => {flushbtn.click()},3 * 60 * 1e3);  // 定时刷新
            });

        }
    };

    $(document).ready(function() {
        RSSBoard.init();
    });
})(jQuery);