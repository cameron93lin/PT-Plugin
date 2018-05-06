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
function FileSizetoBytes(size) {
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

/** 将Bytes形式的文件大小转换为字符串
 * @return {string}
 */
function FileBytestoSize(bytes) {
    let ret;
    let kilobyte = 1024;
    let megabyte = 1024 * 1024;
    let gigabyte = 1024 * 1024 * 1024;
    let terabyte = 1024 * 1024 * 1024 * 1024;

    if ((bytes >= 0) && (bytes < kilobyte)) {
        ret = bytes + ' B';
    } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
        ret = (bytes / kilobyte).toFixed(2) + ' KB';
    } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
        ret = (bytes / megabyte).toFixed(2) + ' MB';
    } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
        ret = (bytes / gigabyte).toFixed(2) + ' GB';
    } else if (bytes >= terabyte) {
        ret = (bytes / terabyte).toFixed(2) + ' TB';
    }
    return ret
}

function makeRequest(method, url) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                let parser = html_parser(xhr.responseText);
                resolve({
                    xhr: xhr,
                    doc: parser.doc,
                    body: parser.body,
                    page: parser.page,
                });
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}