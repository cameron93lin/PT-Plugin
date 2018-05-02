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

const time_regex = /\d{4}-\d{2}-\d{2}[^\d]+?\d{2}:\d{2}:\d{2}/;
const time_regen_replace = /-(\d{2})[^\d]+?(\d{2}):/;

/** 将字符串形式的文件大小转换为Bytes
 * @return {number}
 */
function FileSizetoLength(size) {
    let _size_raw_match = size.match(/^([\d.]+)[^TGMK]?([TGMK]?i?B)$/);
    if (_size_raw_match) {
        let _size_num = parseFloat(_size_raw_match[1]);
        let _size_type = _size_raw_match[2];
        switch (true) {
            case /Ti?B/.test(_size_type):
                return _size_num * Math.pow(2, 40);
            case /Gi?B/.test(_size_type):
                return _size_num * Math.pow(2, 30);
            case /Mi?B/.test(_size_type):
                return _size_num * Math.pow(2, 20);
            case /Ki?B/.test(_size_type):
                return _size_num * Math.pow(2, 10);
            default:
                return _size_num;
        }
    }
    return size;
}
