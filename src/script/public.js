// 存放常用方法

// 解析HTML方法
function html_parser(raw) {
    let doc = (new DOMParser()).parseFromString(raw, 'text/html');  // 页面解析
    let body = doc.querySelector("body");
    let page = $(body); // 构造 jQuery 对象
    return {
        raw: raw,
        doc: doc,
        body: body,
        page: page,
    }
}

// 检查Object是不是为空
function isEmpty(obj) {
    for(let key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

