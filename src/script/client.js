system.clients.config_html = function(clienttype, name) {
    let generalsettings = `<tbody>
				<tr>
					<td><span class="title">Name</span></td>
					<td><input type="text" name="name" value="${name}" /></td>
				</tr>
				<tr>
					<td><span class="title">Type</span></td>
					<td><input type="hidden" name="client" value="${clienttype}" /> ${clienttype}</td>
				</tr>
				<tr>
					<td><span class="title">Host</span></td>
					<td><input type="text" name="host" /><br />
						<span class="tip">The ip/hostname to connect to</span></td>
				</tr>
				<tr>
					<td><span class="title">Port</span></td>
					<td><input type="text" name="port" /><br />
						<span class="tip">The remote port</span></td>
				</tr>
				<tr>
					<td><span class="title">SSL</span></td>
					<td><input type="checkbox" name="hostsecure" /><br />
						<span class="tip">Check if the WebUI runs on SSL (http<strong>s</strong>://). Set the Port to 443!</span></td>
				</tr>
				<tr>
					<td><span class="title">Username</span></td>
					<td><input type="text" name="login" /><br />
						<span class="tip">Login name of the WebUI</span></td>
				</tr>
				<tr>
					<td><span class="title">Password</span></td>
					<td><input type="password" name="password" /><br />
						<span class="tip">Password of the WebUI</span></td>
				</tr>
			</tbody>`;

    var clientMap = {
        "ruTorrent WebUI" : RTA.clients.config.rutorrent,
        "Torrentflux WebUI" : RTA.clients.config.torrentflux,
        "uTorrent WebUI" : RTA.clients.config.utorrent,
        "Deluge WebUI" : RTA.clients.config.deluge,
        "Hadouken WebUI" : RTA.clients.config.hadouken,
        "flood WebUI" : RTA.clients.config.flood,
        "QNAP DownloadStation" : RTA.clients.config.qnap,
        "qBittorrent WebUI" : RTA.clients.config.qbittorrent
    };

    var config = "<table>" + RTA.clients.config.generalsettings.replace(/\{clienttype\}/g, client).replace(/\{name\}/g, name);

    if(clientMap.hasOwnProperty(client))
        config += clientMap[client];




    return config
}


// src/btclient/BuffaloWebUI.js
system.clients.buffaloAdder = function(server, data, torrentname) {
    if(data.substring(0,7) == "magnet:") {
        system.displayResponse("Client Failure", "Link sending not implemented (due to lack of testing equipment).", true);
        return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://" + server.host + ":" + server.port + "/api/torrent-add?start=yes", true, server.login, server.password);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            if(/.*apiTorrentAddFinishedOk.*/.exec(xhr.responseText)) {
                system.displayResponse("Success", "Torrent added successfully.");
            } else {
                system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
            }
        } else if(xhr.readyState == 4 && xhr.status != 200) {
            system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
        }
    };

    // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
    var boundary = "AJAX-----------------------" + (new Date).getTime();
    xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
    var message = "--" + boundary + "\r\n";
    message += "Content-Disposition: form-data; name=\"fileEl\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
    message += "Content-Type: application/x-bittorrent\r\n\r\n";
    message += data + "\r\n";
    message += "--" + boundary + "--\r\n";

    xhr.sendAsBinary(message);
}

// src/btclient/DelugeWebUI.js
system.clients.delugeAdder = function(server, torrentdata, filename) {
    var rnd = Math.floor(Math.random()*999999);

    var relPath = (server.delugerelativepath == undefined) ? "" : server.delugerelativepath;

    var xhr = new XMLHttpRequest();
    var scheme = server.hostsecure ? "https" : "http";
    xhr.open("POST", scheme + "://" + server.host + ":" + server.port + relPath + "/json", false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({"id": rnd, "method": "auth.login", "params": [server.password]}));

    var xhr = new XMLHttpRequest();
    xhr.open("POST", scheme + "://" + server.host + ":" + server.port + relPath + "/json", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            if(JSON.parse(xhr.responseText)["error"] == null) {
                system.displayResponse("Success", "Torrent added successfully.");
            } else {
                system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + " (" + xhr.statusText + "): " + xhr.responseText, true);
            }
        } else if(xhr.readyState == 4 && xhr.status != 200) {
            system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + " (" + xhr.statusText + "): " + xhr.responseText, true);
        }
    };

    var message;

    if(torrentdata.substring(0,7) == "magnet:") {
        message = JSON.stringify({"id": rnd + 1, "method": "core.add_torrent_magnet", "params": [torrentdata, {}]});
    } else {
        // for proper base64 encoding, this needs to be shifted into a 8 byte integer array
        var data = new ArrayBuffer(torrentdata.length);
        var ui8a = new Uint8Array(data, 0);
        for (var i=0; i<torrentdata.length; i++) {
            ui8a[i] = (torrentdata.charCodeAt(i) & 0xff);
        }
        message = JSON.stringify({"id": rnd + 2, "method": "core.add_torrent_file", "params": [filename, b64_encode(ui8a), {}]});
    }
    xhr.send(message)
}

// src/btclient/floodWebUI.js
function flood_handleResponse(server, data) {
    if(this.readyState == 4 && this.status == 200) {
        if(this.responseText == "[[0]]") {
            system.displayResponse("Success", "Torrent added successfully.");
        }
    } else if(this.readyState == 4 && this.status != 200) {
        system.displayResponse("Failure", "Server responded with an irregular HTTP error code.\nHTTP: " + this.status + " " + this.statusText + "\nContent:" + this.responseText, true);
    }
}

system.clients.floodAdder = function(server, torrentdata) {
    var scheme = server.hostsecure ? "https://" : "http://";
    var dir = server.flooddirectory;
    var paused = server.floodaddpaused;

    // run the login first
    var xhr = new XMLHttpRequest();
    xhr.open("POST", scheme + server.host + ":" + server.port + "/auth/authenticate", false);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    var loginMsg = JSON.stringify({"username": server.login, "password": server.password});
    xhr.send(loginMsg);

    var loginJson;
    if(xhr.status == 200) {
        loginJson = JSON.parse(xhr.response);
    } else {
        system.displayResponse("Failure", "Problem logging into flood. HTTP code " + xhr.status + " " + xhr.statusText + "\nContent:" + xhr.responseText, true);
        return;
    }

    if(torrentdata.substring(0,7) == "magnet:") {
        var mxhr = new XMLHttpRequest();
        mxhr.open("POST", scheme + server.host + ":" + server.port + "/api/client/add", true);
        mxhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
        mxhr.onreadystatechange = flood_handleResponse;
        var message = JSON.stringify({ "urls": [ torrentdata ], "start": !paused, "destination": (!!dir ? dir: undefined) });
        mxhr.send(message);
    } else {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", scheme + server.host + ":" + server.port + "/api/client/add-files", true);
        xhr.onreadystatechange = flood_handleResponse;
        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        var boundary = "AJAX-----------------------" + (new Date).getTime();
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"torrents\"; filename=\"file.torrent\"\r\n";
        message += "Content-Type: application/octet-stream\r\n\r\n";
        message += torrentdata + "\r\n";

        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"tags\"\r\n\r\n";
        message += "" + "\r\n"; // TODO: labels here, comma separated

        if(dir != undefined && dir.length > 0) {
            message += "--" + boundary + "\r\n";
            message += "Content-Disposition: form-data; name=\"destination\"\r\n\r\n";
            message += dir + "\r\n";
        }

        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"start\"\r\n\r\n";
        message += (!paused) + "\r\n";

        message += "--" + boundary + "--\r\n";

        xhr.sendAsBinary(message);
    }
}

// src/btclient/HadoukenWebUI.js
system.clients.hadoukenAdder = function(server, torrentdata, name) {
    var xhr = new XMLHttpRequest();

    xhr.open("POST", "http://" + server.host + ":" + server.port + "/jsonrpc", false);
    xhr.setRequestHeader("Authorization", "Token " + server.hadoukentoken);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            if(JSON.parse(xhr.responseText).result == null) {
                system.displayResponse("Success", "Torrent added successfully.");
            } else {
                system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + " (" + xhr.statusText + "): " + xhr.responseText, true);
            }
        } else if(xhr.readyState == 4 && xhr.status != 200) {
            system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + " (" + xhr.statusText + "): " + xhr.responseText, true);
        }
    };

    var message;

    if(torrentdata.substring(0,7) == "magnet:") {
        message = JSON.stringify({
            "id": 1,
            "jsonrpc": "2.0",
            "method": "torrents.addUrl",
            "params": [
                torrentdata,
                {
                    "savePath": server.hadoukendir == "" ? undefined : server.hadoukendir,
                    "label": server.hadoukenlabel
                }
            ]
        });
    } else {
        // for proper base64 encoding, this needs to be shifted into a 8 byte integer array
        var data = new ArrayBuffer(torrentdata.length);
        var ui8a = new Uint8Array(data, 0);
        for (var i=0; i<torrentdata.length; i++) {
            ui8a[i] = (torrentdata.charCodeAt(i) & 0xff);
        }
        message = JSON.stringify({
            "id": 1,
            "jsonrpc": "2.0",
            "method": "torrents.addFile",
            "params": [
                b64_encode(ui8a),
                {
                    "savePath": server.hadoukendir == "" ? undefined : server.hadoukendir,
                    "label": server.hadoukenlabel
                }
            ]
        });
    }console.debug(message);
    xhr.send(message)
}


// src/btclient/nodejsrtorrentWebUI.js
function njs_handleResponse(server, data) {
    if(this.readyState == 4 && this.status == 200) {
        if(this.responseText == "0") {
            system.displayResponse("Success", "Torrent added successfully.");
        }
    } else if(this.readyState == 4 && this.status != 200) {
        system.displayResponse("Failure", "Server responded with an irregular HTTP error code.\nHTTP: " + this.status + " " + this.statusText + "\nContent:" + this.responseText, true);
    }
}

system.clients.nodeJSrTorrentAdder = function(server, torrentdata) {
    var scheme = server.hostsecure ? "https://" : "http://";

    // run the login first
    var xhr = new XMLHttpRequest();
    xhr.open("POST", scheme + server.host + ":" + server.port + "/login", false);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    var loginMsg = JSON.stringify({"email": server.login, "password": server.password});
    xhr.send(loginMsg);

    var loginJson;
    if(xhr.status == 200) {
        loginJson = JSON.parse(xhr.response);
    } else {
        system.displayResponse("Failure", "Problem logging into NodeJS-rTorrent. HTTP code " + xhr.status + " " + xhr.statusText + "\nContent:" + xhr.responseText, true);
        return;
    }

    if(torrentdata.substring(0,7) == "magnet:") {
        var mxhr = new XMLHttpRequest();
        mxhr.open("POST", scheme + server.host + ":" + server.port + "/torrents/load", true);
        mxhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        mxhr.setRequestHeader("Authorization", "Bearer " + loginJson._id + ":" + loginJson.expires + ":" + loginJson.token);
        mxhr.onreadystatechange = njs_handleResponse;
        var message = JSON.stringify({ url: torrentdata });
        mxhr.send(message);
    } else {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", scheme + server.host + ":" + server.port + "/torrents/load", true);
        xhr.setRequestHeader("Authorization", "Bearer " + loginJson._id + ":" + loginJson.expires + ":" + loginJson.token);
        xhr.onreadystatechange = njs_handleResponse;
        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        var boundary = "AJAX-----------------------" + (new Date).getTime();
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"file\"; filename=\"file.torrent\"\r\n";
        message += "Content-Type: application/x-bittorrent\r\n\r\n";
        message += torrentdata + "\r\n";
        message += "--" + boundary + "--\r\n";

        xhr.sendAsBinary(message);
    }
}

// src/btclient/pyrtWebUI.js
system.clients.pyrtAdder = function(server, data, filename) {
    if(data.substring(0,7) == "magnet:") {
        displayResponse("Client Failure", "sorry, pyrt doesn't support magnet", true);
        return;
    }

    var url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/";
    // log in to create a functioning session
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, false);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send("password=" + server.password);

    if(/.*Incorrect Password.*/.exec(xhr.responseText)) {
        system.displayResponse("Failure", "Credentials weren't accepted:\n" + xhr.responseText, true);
        return;
    }

    // send the torrent
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url + "ajax", true, server.login, server.password);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            if(/.*Redirect.*/.exec(xhr.responseText)) {
                system.displayResponse("Success", "Torrent added successfully.");
            } else {
                system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
            }
        } else if(xhr.readyState == 4 && xhr.status != 200) {
            system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
        }
    };

    // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
    var boundary = "AJAX-----------------------" + (new Date).getTime();

    xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

    var message = "--" + boundary + "\r\n";
    message += "Content-Disposition: form-data; name=\"request\"\r\n\r\n";
    message += "upload_torrent\r\n";
    message += "--" + boundary + "\r\n";
    message += "Content-Disposition: form-data; name=\"start\"\r\n\r\n";
    message += "on\r\n";
    message += "--" + boundary + "\r\n";
    message += "Content-Disposition: form-data; name=\"torrent\"; filename=\"" + filename + "\"\r\n";
    message += "Content-Type: application/x-bittorrent\r\n\r\n";
    message += data + "\r\n";
    message += "--" + boundary + "--\r\n";

    xhr.sendAsBinary(message);
}

// src/btclient/qBittorrentWebUI.js
system.clients.qBittorrentAdder = function(server, data, torrentname, label, dir) {
    var target;
    if(data.substring(0,7) == "magnet:")
        target = "download";
    else
        target = "upload";


    var rootUrl = (server.hostsecure ? "https" : "http") + "://" + server.host + ":" + server.port;

    var loginXhr = new XMLHttpRequest();
    loginXhr.open("POST", rootUrl + "/login", true);
    loginXhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
    loginXhr.send("username=" + encodeURIComponent(server.login) + "&password=" + encodeURIComponent(server.password));
    loginXhr.onreadystatechange = function() {
        if(loginXhr.readyState == 4) {
            xhr = new XMLHttpRequest();
            xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/command/" + target, true, server.login, server.password);
            xhr.onreadystatechange = function(data) {
                if(xhr.readyState == 4 && xhr.status == 200) {
                    system.displayResponse("Success", "Torrent added successfully.");
                } else if(xhr.readyState == 4 && xhr.status != 200) {
                    system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
                }
            };

            var boundary = "AJAX-----------------------" + (new Date).getTime();
            xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
            var message = "--" + boundary + "\r\n";

            if(data.substring(0,7) == "magnet:") {
                message += "Content-Disposition: form-data; name=\"urls\"\r\n\r\n";
                message += data + "\r\n";
                message += "--" + boundary + "\r\n";
            } else {
                message += "Content-Disposition: form-data; name=\"fileselect[]\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
                message += "Content-Type: application/x-bittorrent\r\n\r\n";
                message += data + "\r\n";
                message += "--" + boundary + "\r\n";
            }

            if(dir) {
                message += "Content-Disposition: form-data; name=\"savepath\"\r\n\r\n"
                message += dir + "\r\n";
                message += "--" + boundary + "\r\n";
            }

            if(label) {
                message += "Content-Disposition: form-data; name=\"category\"\r\n\r\n"
                message += label + "\r\n";
                message += "--" + boundary + "--\r\n";
            }

            xhr.sendAsBinary(message);
        }
    };
}

// src/btclient/QnapDownloadStation.js
system.clients.qnapDownloadStationAdder = function(server, torrentdata, torrentname) {

    var handleResponse = function(server, data) {
        if(this.readyState == 4 && this.status == 200) {
            var json = JSON.parse(this.responseText);
            if(json.error === 0) {
                system.displayResponse("Success", "Torrent added successfully.");
            } else if(json.error === 8196) {
                system.displayResponse("Success", "Torrent already queued.");
            } else {
                system.displayResponse("Failure", "Server didn't accept data: " + JSON.stringify(this.responseText), true);
            }
        } else if(this.readyState == 4 && this.status != 200) {
            system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + this.status + ": " + this.responseText, true);
        }
    }

    var scheme = server.hostsecure ? "https://" : "http://";

    var xhr = new XMLHttpRequest();
    xhr.open("POST", scheme + server.host + ":" + server.port + "/downloadstation/V4/Misc/Login", false);
    var formData = new FormData();
    formData.append("user", server.login);
    formData.append("pass", btoa(server.password));
    xhr.send(formData);
    var sid;
    var json = JSON.parse(xhr.response);
    if(json && json.sid) {
        sid = json.sid;
    } else {
        system.displayResponse("Failure", "Problem getting the QNAP DownloadStation SID. Is the configuration correct?", true);
    }

    if(torrentdata.substring(0,7) == "magnet:") {
        var mxhr = new XMLHttpRequest();
        mxhr.open("POST", scheme + server.host + ":" + server.port + "/downloadstation/V4/Task/AddUrl", false);
        var formData = new FormData();
        formData.append("url", torrentdata);
        formData.append("temp", server.qnaptemp);
        formData.append("move", server.qnapmove);
        formData.append("sid", sid);
        mxhr.onreadystatechange = handleResponse;
        mxhr.send(formData);
    } else {
        var txhr = new XMLHttpRequest();
        txhr.open("POST", scheme + server.host + ":" + server.port + "/downloadstation/V4/Task/AddTorrent", false);
        txhr.onreadystatechange = handleResponse;
        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        var boundary = "AJAX-----------------------" + (new Date).getTime();
        txhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"temp\"\r\n\r\n";
        message += server.qnaptemp + "\r\n";

        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"move\"\r\n\r\n";
        message += server.qnapmove + "\r\n";

        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"sid\"\r\n\r\n";
        message += sid + "\r\n";

        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"file\"; filename=\"" + torrentname + "\"\r\n";
        message += "Content-Type: application/octet-stream\r\n\r\n";
        message += torrentdata + "\r\n";

        message += "--" + boundary + "--\r\n";

        txhr.sendAsBinary(message);
    }
}

// src/btclient/ruTorrentWebUI.js
system.clients.ruTorrentAdder = function(server, data, label, dir) {
    if(label == undefined) label = server.rutorrentlabel;
    if(dir == undefined) dir = server.rutorrentdirectory;

    var xhr = new XMLHttpRequest();

    var url = "http";
    url += (server.hostsecure ? "s" : "");
    url += "://";
    url += server.host;
    url += ":" + server.port;
    if(server.ruTorrentrelativepath == undefined || server.ruTorrentrelativepath[0] != "/")
        url += "/"; // first slash
    if(server.ruTorrentrelativepath != undefined)
        url += server.ruTorrentrelativepath;
    if(server.ruTorrentrelativepath != undefined && server.ruTorrentrelativepath.length != 0 && server.ruTorrentrelativepath[server.ruTorrentrelativepath.length - 1] != "/")
        url += "/"; // trailing slash
    url += "php/addtorrent.php?";
    if(dir != undefined && dir.length > 0)
        url += "dir_edit=" + encodeURIComponent(dir) + "&";
    if(label != undefined && label.length > 0)
        url += "label=" + encodeURIComponent(label);
    if(server.rutorrentaddpaused)
        url += "&torrents_start_stopped=1";

    xhr.open("POST", url, true, server.login, server.password);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            if(/.*addTorrentSuccess.*/.exec(xhr.responseText)) {
                system.displayResponse("Success", "Torrent added successfully.");
            } else {
                system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
            }
        } else if(xhr.readyState == 4 && xhr.status != 200) {
            system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
        }
    };

    // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
    var boundary = "AJAX-----------------------" + (new Date).getTime();
    var message = "";

    if(data.substring(0,7) == "magnet:") {
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send("url=" + encodeURIComponent(data));
    } else {
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

        if(dir != undefined && dir.length > 0) {
            message += "--" + boundary + "\r\n";
            message += "Content-Disposition: form-data; name=\"dir_edit\"\r\n\r\n";
            message += dir + "\r\n";
        }
        if(label != undefined && label.length > 0) {
            message += "--" + boundary + "\r\n";
            message += "Content-Disposition: form-data; name=\"tadd_label\"\r\n\r\n";
            message += label + "\r\n";
        }
        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"torrent_file\"; filename=\"" + (new Date).getTime() + ".torrent\"\r\n";
        message += "Content-Type: application/x-bittorrent\r\n\r\n";
        message += data + "\r\n";
        message += "--" + boundary + "--\r\n";

        xhr.sendAsBinary(message);
    }
}

// src/btclient/SynologyWebUI.js
function synology_handleResponse(server, data) {
    if(this.readyState == 4 && this.status == 200) {
        var json = JSON.parse(this.responseText);
        if(json.success) {
            system.displayResponse("Success", "Torrent added successfully.");
        } else {
            system.displayResponse("Failure", "Server didn't accept data: " + JSON.stringify(this.responseText), true);
        }
    } else if(this.readyState == 4 && this.status != 200) {
        system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + this.status + ": " + this.responseText, true);
    }
}

system.clients.synologyAdder = function(server, torrentdata, torrentname) {
    var scheme = server.hostsecure ? "https://" : "http://";

    var xhr = new XMLHttpRequest();
    xhr.open("GET", scheme + server.host + ":" + server.port + "/webapi/auth.cgi?api=SYNO.API.Auth&version=2&method=login&account=" + server.login + "&passwd=" + server.password + "&session=DownloadStation&format=sid", false);
    xhr.send(null);
    var sid;
    var json = JSON.parse(xhr.response);
    if(json && json.data) {
        sid = json.data.sid;
    } else {
        system.displayResponse("Failure", "Problem getting the Synology SID. Is the configuration correct?", true);
    }

    if(torrentdata.substring(0,7) == "magnet:") {
        console.log("DATA: " + torrentdata);
        console.log("GET: " + scheme + server.host + ":" + server.port + "/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=2&method=create&_sid=" + sid + "&uri=" + encodeURIComponent(torrentdata));
        var mxhr = new XMLHttpRequest();
        mxhr.open("GET", scheme + server.host + ":" + server.port + "/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=2&method=create&_sid=" + sid + "&uri=" + encodeURIComponent(torrentdata), true);
        mxhr.onreadystatechange = synology_handleResponse;
        mxhr.send(message);
    } else {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", scheme + server.host + ":" + server.port + "/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=2&method=create&_sid=" + sid, true);
        xhr.onreadystatechange = synology_handleResponse;
        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        var boundary = "AJAX-----------------------" + (new Date).getTime();
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"api\"\r\n\r\n";
        message += "SYNO.DownloadStation.Task" + "\r\n";

        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"version\"\r\n\r\n";
        message += "2" + "\r\n";

        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"method\"\r\n\r\n";
        message += "create" + "\r\n";

        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"_sid\"\r\n\r\n";
        message += sid + "\r\n";

        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"file\"; filename=\"" + torrentname + "\"\r\n";
        message += "Content-Type: application/octet-stream\r\n\r\n";
        message += torrentdata + "\r\n";

        message += "--" + boundary + "--\r\n";

        xhr.sendAsBinary(message);
    }
}

// src/btclient/TixatiWebUI.js
system.clients.tixatiAdder = function(server, data, torrentname) {
    var target;
    if(data.substring(0,7) == "magnet:")
        target = "download";
    else
        target = "upload";

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/transfers/action", true, server.login, server.password);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            displayResponse("Success", "Torrent added successfully.");
        } else if(xhr.readyState == 4 && xhr.status != 200) {
            displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
        }
    };

    var boundary = "AJAX-----------------------" + (new Date).getTime();
    if(data.substring(0,7) == "magnet:") {
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"addlinktext\"\r\n\r\n";
        message += data + "\r\n";
        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"addlink\"\r\n\r\n";
        message += "Add\r\n";
        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"noautostart\"\r\n\r\n";
        message += "0\r\n";
        xhr.send(message);
    } else {
        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"metafile\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
        message += "Content-Type: application/x-bittorrent\r\n\r\n";
        message += data + "\r\n";
        message += "--" + boundary + "--\r\n";
        message += "Content-Disposition: form-data; name=\"addmetafile\"\r\n\r\n";
        message += "Add\r\n";
        message += "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"noautostart\"\r\n\r\n";
        message += "0\r\n";
        message += "--" + boundary + "\r\n";
        xhr.sendAsBinary(message);
    }
}

// src/btclient/TorrentfluxWebUI.js
system.clients.torrentfluxAdder = function(server, torrentdata, torrentname) {
    if(torrentdata.substring(0,7) == "magnet:") {
        displayResponse("Client Failure", "sorry, but torrentflux doesn't support magnet links.");
        return;
    }

    var loginurl = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + server.torrentfluxrelativepath + "/login.php";

    // log in to create a functioning session
    var xhr = new XMLHttpRequest();
    xhr.open("POST", loginurl, false);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send("username=" + server.login + "&iamhim=" + server.password);

    if(/.*Password is required.*/.exec(xhr.responseText) || /.*Login failed.*/.exec(xhr.responseText)) {
        system.displayResponse("Failure", "Credentials weren't accepted:\n" + xhr.responseText, true);
        return;
    }

    // send the torrent
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + server.torrentfluxrelativepath + "/index.php", true);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            system.displayResponse("Success", "Torrent added successfully.");
        } else if(xhr.readyState == 4 && xhr.status != 200) {
            system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
        }
    };

    // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
    var boundary = "AJAX-----------------------" + (new Date).getTime();
    xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
    var message = "--" + boundary + "\r\n";
    message += "Content-Disposition: form-data; name=\"upload_file\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
    message += "Content-Type: application/x-bittorrent\r\n\r\n";
    message += torrentdata + "\r\n";
    message += "--" + boundary + "--\r\n";

    xhr.sendAsBinary(message);
}

// src/btclient/TransmissionWebUI.js
system.clients.transmissionAdder = function(server, torrentdata) {
    sendXHRTransmissionWebUI(server, torrentdata, "");
};

function sendXHRTransmissionWebUI(server, torrentdata, sessionid) {
    // for proper base64 encoding, this needs to be shifted into a 8 byte integer array
    var data = new ArrayBuffer(torrentdata.length);
    var ui8a = new Uint8Array(data, 0);
    for (var i=0; i<torrentdata.length; i++) {
        ui8a[i] = (torrentdata.charCodeAt(i) & 0xff);
    }

    var message;

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/transmission/rpc", true, server.login, server.password);
    xhr.setRequestHeader("X-Transmission-Session-Id", sessionid);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            if(/.*"result":"success".*/.exec(xhr.responseText)) {
                system.displayResponse("Success", "Torrent added successfully.");
            } else {
                system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
            }
        } else if(xhr.readyState == 4 && xhr.status == 409) {
            sendXHRTransmissionWebUI(server, torrentdata, xhr.getResponseHeader('X-Transmission-Session-Id'));
        } else if(xhr.readyState == 4 && xhr.status != 200 && xhr.status != 409) {
            system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
        }
    };

    if(torrentdata.substring(0,7) == "magnet:") {
        message = JSON.stringify({"method": "torrent-add", "arguments": {"paused": "false", "filename": torrentdata}});
    } else {
        message = JSON.stringify({"method": "torrent-add", "arguments": {"metainfo": b64_encode(ui8a)}});
    }
    xhr.send(message);
}

// src/btclient/tTorrentWebUI.js
system.clients.tTorrentAdder = function(server, data, torrentname) {
    var target;
    if(data.substring(0,7) == "magnet:") {
        target = "downloadFromUrl";
    } else {
        target = "downloadTorrent";
    }

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/cmd/" + target, true, server.login, server.password);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 302) {
            system.displayResponse("Success", "Torrent added successfully.");
        } else if(xhr.readyState == 4 && xhr.status != 302) {
            system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
        }
    };

    var boundary = "AJAX-----------------------" + (new Date).getTime();
    if(data.substring(0,7) == "magnet:") {
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        var message = "url=" + encodeURIComponent(data);
        xhr.send(message);
    } else {
        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"torrentfile\"; filename=\"" + ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime()) + "\"\r\n";
        message += "Content-Type: application/octet-stream\r\n\r\n";
        message += data + "\r\n";
        message += "--" + boundary + "\r\n";
        xhr.sendAsBinary(message);
    }
}

// src/btclient/uTorrentWebUI.js
function ut_handleResponse(server, data) {
    if(this.readyState == 4 && this.status == 200) {
        if(/\{\s*"build":\s*\d+\s*\}/.test(this.responseText)) {
            system.displayResponse("Success", "Torrent added successfully.");
        } else {
            system.displayResponse("Failure", "Server didn't accept data:\n" + this.status + ": " + this.responseText, true);
        }
    } else if(this.readyState == 4 && this.status != 200) {
        system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + this.status + ": " + this.responseText, true);
    }
}

system.clients.uTorrentAdder = function(server, torrentdata) {
    var relpath = (server.utorrentrelativepath == undefined || server.utorrentrelativepath == "") ? "/gui/" : server.utorrentrelativepath;
    var scheme = server.hostsecure ? "https://" : "http://";

    var xhr = new XMLHttpRequest();
    xhr.open("GET", scheme + server.host + ":" + server.port + relpath + "token.html", false, server.login, server.password);
    xhr.send(null);
    var token;
    if(/<div.*?>(.*?)<\/div>/.exec(xhr.response)) {
        token = /<div.*?>(.*?)<\/div>/.exec(xhr.response)[1];
    } else {
        system.displayResponse("Failure", "Problem getting the uTorrent XHR token. Is uTorrent running?", true);
    }

    if(torrentdata.substring(0,7) == "magnet:") {
        var mxhr = new XMLHttpRequest();
        mxhr.open("GET", scheme + server.host + ":" + server.port + relpath + "?token=" + token + "&action=add-url&s=" + encodeURIComponent(torrentdata), true, server.login, server.password);
        mxhr.onreadystatechange = ut_handleResponse;
        mxhr.send(message);
    } else {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", scheme + server.host + ":" + server.port + relpath + "?token=" + token + "&action=add-file", true, server.login, server.password);
        xhr.onreadystatechange = ut_handleResponse;
        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        var boundary = "AJAX-----------------------" + (new Date).getTime();
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"torrent_file\"; filename=\"file.torrent\"\r\n";
        message += "Content-Type: application/x-bittorrent\r\n\r\n";
        message += torrentdata + "\r\n";
        message += "--" + boundary + "--\r\n";

        xhr.sendAsBinary(message);
    }
}

// src/btclient/VuzeHTMLUI.js
function vhtml_handleResponse(data) {
    if(this.readyState == 4 && this.status == 200) {
        if(/.*loaded successfully.*/.exec(this.responseText)) {
            system.displayResponse("Success", "Torrent added successfully.");
        } else {
            system.displayResponse("Failure", "Server didn't accept data:\n" + this.status + ": " + this.responseText, true);
        }
    } else if(this.readyState == 4 && this.status != 200) {
        system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + this.status + ": " + this.responseText, true);
    }
}

system.clients.vuzeHtmlAdder = function(server, data) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://" + server.host + ":" + server.port + "/index.tmpl?d=u&local=1", true, server.login, server.password);
    xhr.onreadystatechange = vhtml_handleResponse;

    if(data.substring(0,7) == "magnet:") {
        var mxhr = new XMLHttpRequest();
        mxhr.open("GET", "http://" + server.host + ":" + server.port + "/index.tmpl?d=u&upurl=" + encodeURIComponent(data), true, server.login, server.password);
        mxhr.onreadystatechange = vhtml_handleResponse;
        mxhr.send(message);
    } else {
        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        var boundary = "AJAX-----------------------" + (new Date).getTime();
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"upfile_1\"; filename=\"file.torrent\"\r\n";
        message += "Content-Type: application/x-bittorrent\r\n\r\n";
        message += data + "\r\n";
        message += "--" + boundary + "--\r\n";

        xhr.sendAsBinary(message);
    }
}

// src/btclient/VuzeRemoteUI.js
system.clients.vuzeRemoteAdder = function(server, data) {
    if(data.substring(0,7) == "magnet:") target = "rpc";
    else target = "upload?paused=false";

    // fire off one unspecific request to get the proper CSRF header

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/transmission/" + target, false, server.login, server.password);
    xhr.send();

    xhr = new XMLHttpRequest();
    xhr.open("POST", "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/transmission/" + target, true, server.login, server.password);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            if(/.*<h1>200: OK<\/h1>.*/.exec(xhr.responseText) || JSON.parse(xhr.responseText)["result"] == "success") {
                system.displayResponse("Success", "Torrent added successfully.");
            } else {
                system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
            }
        } else if(xhr.readyState == 4 && xhr.status != 200) {
            system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
        }
    };

    if(data.substring(0,7) == "magnet:") {
        var message = JSON.stringify({"method": "torrent-add", "arguments": {"paused": "false", "filename": data}});
        xhr.send(message);
    } else {
        var boundary = "AJAX-----------------------" + (new Date).getTime();
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"torrent_files[]\"; filename=\"file.torrent\"\r\n";
        message += "Content-Type: application/x-bittorrent\r\n\r\n";
        message += data + "\r\n";
        message += "--" + boundary + "--\r\n";

        xhr.sendAsBinary(message);
    }
}

// src/btclient/VuzeSwingUI.js
system.clients.vuzeSwingAdder = function(server, data) {
    if(data.substring(0,7) == "magnet:") {
        system.displayResponse("Client Failure", "sorry, no magnet/link adding support from vuze swing ui. try the vuze remote plugin.", true);
        return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://" + server.host + ":" + server.port + "/upload.cgi", true, server.login, server.password);
    xhr.onreadystatechange = function(data) {
        if(xhr.readyState == 4 && xhr.status == 200) {
            if(/.*Upload OK.*/.exec(xhr.responseText)) {
                system.displayResponse("Success", "Torrent added successfully.");
            } else {
                system.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
            }
        } else if(xhr.readyState == 4 && xhr.status != 200) {
            system.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
        }
    };

    // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
    var boundary = "AJAX-----------------------" + (new Date).getTime();
    xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
    var message = "--" + boundary + "\r\n";
    message += "Content-Disposition: form-data; name=\"upfile\"; filename=\"file.torrent\"\r\n";
    message += "Content-Type: application/x-bittorrent\r\n\r\n";
    message += data + "\r\n";
    message += "--" + boundary + "--\r\n";

    xhr.sendAsBinary(message);
}