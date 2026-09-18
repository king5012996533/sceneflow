/**
 * 出站代理（OUTBOUND_PROXY_URL / OUTBOUND_PROXY_HOSTS）单元测试。
 *
 * 起因：服务器所在网络直连 api.apimart.ai 必然失败（DNS 污染 + SNI 阻断），
 * 但运维侧的本地代理隧道是通的（curl 实测 200 / 366 模型）。SSRF 守卫不允许把域名
 * 指到 127.0.0.1（解析后逐个地址校验，回环地址一律拒），所以唯一干净的接法是
 * 让应用自己支持出站代理。加了这个开关之后必须守住三条线：
 *   1. 不配环境变量时，行为与纯直连版本一致（内网/保留地址拦截照旧）；
 *   2. 白名单是「精确相等或其子域」，不能用子串，否则 evilapimart.ai 会被顺带放行；
 *   3. 配了代理也不能让未白名单的地址放宽校验（代理是运维配置，不是用户可控输入）。
 *
 * 运行：npm run test:proxy
 */
import assert from "node:assert";
import http from "node:http";
import net from "node:net";

import { CONNECT_ATTEMPT_TIMEOUT_MS, CONNECT_RACE_STAGGER_MS, assertAllowedProxyUrl, fetchSafely } from "../src/lib/url-safety.ts";

let passed = 0;
const failures = [];

async function check(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        failures.push(name);
        console.error(`  FAIL ${name}\n       ${error.message}`);
        process.exitCode = 1;
    }
}

/** 断言 promise 以指定文案失败（成功反而算失败）。 */
async function rejectsWith(label, run, includes) {
    let message = null;
    try {
        await run();
    } catch (error) {
        message = String(error?.message ?? error);
    }
    assert.ok(message !== null, `${label}：期望抛错，实际成功了`);
    assert.ok(message.includes(includes), `${label}：期望错误含「${includes}」，实际「${message}」`);
}

/** 临时设置环境变量并在结束后还原。 */
async function withEnv(vars, fn) {
    const saved = new Map();
    for (const [key, value] of Object.entries(vars)) {
        saved.set(key, process.env[key]);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    try {
        return await fn();
    } finally {
        for (const [key, value] of saved) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

/**
 * 假 CONNECT 代理：记录收到的请求行，并把流量转给本地源站。
 * 故意无视请求里的主机名（一律拨到 dialPort），这样用例可以用「本地无法解析的域名」
 * 来区分「走了代理」与「走了直连」——直连会对该域名解析失败。
 */
function startFakeProxy({ dialPort, connectStatus = 200 }) {
    const hits = [];
    const server = net.createServer((client) => {
        let buffer = Buffer.alloc(0);
        const onData = (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            const headerEnd = buffer.indexOf("\r\n\r\n");
            if (headerEnd === -1) return;
            client.off("data", onData);

            const head = buffer.subarray(0, headerEnd).toString("latin1");
            const rest = buffer.subarray(headerEnd + 4);
            const lines = head.split("\r\n");
            const [method, target, version] = lines[0].split(" ");
            const isConnect = method.toUpperCase() === "CONNECT";
            hits.push({ requestLine: lines[0], isConnect });

            if (isConnect && connectStatus !== 200) {
                client.end(`HTTP/1.1 ${connectStatus} Proxy Error\r\n\r\n`);
                return;
            }

            const upstream = net.connect(dialPort, "127.0.0.1");
            upstream.on("error", () => client.destroy());
            client.on("error", () => upstream.destroy());

            if (isConnect) {
                client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
                if (rest.length > 0) upstream.write(rest);
            } else {
                // 绝对形式 URI 的转发语义：请求行改回 origin-form 再转给源站
                const absolute = new URL(target);
                upstream.write([`${method} ${absolute.pathname}${absolute.search} ${version}`, ...lines.slice(1)].join("\r\n") + "\r\n\r\n");
                if (rest.length > 0) upstream.write(rest);
            }
            client.pipe(upstream);
            upstream.pipe(client);
        };
        client.on("data", onData);
        client.on("error", () => {});
    });
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve({ server, hits, port: server.address().port }));
    });
}

/** 只收字节不做握手回应的 TCP 服务：用来截 TLS ClientHello 验证 SNI。 */
function startCapture() {
    const state = { bytes: Buffer.alloc(0) };
    const server = net.createServer((socket) => {
        socket.on("data", (chunk) => {
            state.bytes = Buffer.concat([state.bytes, chunk]);
            socket.destroy();
        });
        socket.on("error", () => {});
    });
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve({ server, state, port: server.address().port }));
    });
}

const origin = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ host: req.headers.host, url: req.url, method: req.method }));
});
await new Promise((resolve) => origin.listen(0, "127.0.0.1", resolve));
const originPort = origin.address().port;

const proxy = await startFakeProxy({ dialPort: originPort });
const rejectProxy = await startFakeProxy({ dialPort: originPort, connectStatus: 407 });
const capture = await startCapture();
const sniProxy = await startFakeProxy({ dialPort: capture.port });

/** 拿一个没人监听的端口，用来测「代理不可达」。 */
const deadPort = await new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
        const port = probe.address().port;
        probe.close(() => resolve(port));
    });
});

const PROXY_URL = `http://127.0.0.1:${proxy.port}`;

console.log("出站代理单元测试");

await check("未配置代理时，内网地址照旧被拦（行为与直连版本一致）", async () => {
    await withEnv({ OUTBOUND_PROXY_URL: undefined, OUTBOUND_PROXY_HOSTS: undefined }, async () => {
        await rejectsWith("127.0.0.1", () => assertAllowedProxyUrl("http://127.0.0.1:9/x"), "不允许代理内网或本机地址");
        await rejectsWith("169.254.169.254", () => assertAllowedProxyUrl("http://169.254.169.254/latest/meta-data"), "不允许代理内网或本机地址");
    });
});

await check("只配代理地址、不配白名单 = 代理不生效", async () => {
    await withEnv({ OUTBOUND_PROXY_URL: PROXY_URL, OUTBOUND_PROXY_HOSTS: undefined }, async () => {
        await rejectsWith("127.0.0.1", () => assertAllowedProxyUrl("http://127.0.0.1:9/x"), "不允许代理内网或本机地址");
    });
});

await check("配了代理也不放宽未白名单地址的校验", async () => {
    await withEnv({ OUTBOUND_PROXY_URL: PROXY_URL, OUTBOUND_PROXY_HOSTS: "proxied.invalid" }, async () => {
        await rejectsWith("127.0.0.1", () => assertAllowedProxyUrl("http://127.0.0.1:9/x"), "不允许代理内网或本机地址");
        await rejectsWith("10.0.0.1", () => assertAllowedProxyUrl("https://10.0.0.1/x"), "不允许代理内网或本机地址");
    });
});

await check("白名单命中的域名不做本地 DNS（本地解析不出也照样通）", async () => {
    const before = proxy.hits.length;
    await withEnv({ OUTBOUND_PROXY_URL: PROXY_URL, OUTBOUND_PROXY_HOSTS: "proxied.invalid" }, async () => {
        const response = await fetchSafely(`http://proxied.invalid:${originPort}/echo?a=1`);
        assert.strictEqual(response.status, 200);
        const body = await response.json();
        assert.strictEqual(body.url, "/echo?a=1", "源站应按 origin-form 收到路径");
        assert.strictEqual(body.host, `proxied.invalid:${originPort}`, "Host 头必须是原始域名（不是代理地址）");
    });
    assert.strictEqual(proxy.hits.length, before + 1, "应恰好经代理一次");
    assert.strictEqual(proxy.hits.at(-1).requestLine, `GET http://proxied.invalid:${originPort}/echo?a=1 HTTP/1.1`, "http 目标应走绝对形式请求行");
    assert.strictEqual(proxy.hits.at(-1).isConnect, false, "http 目标不该发 CONNECT");
});

await check("https 目标经代理走 CONNECT 隧道，且隧道内 SNI 是真实域名", async () => {
    const before = sniProxy.hits.length;
    await withEnv({ OUTBOUND_PROXY_URL: `http://127.0.0.1:${sniProxy.port}`, OUTBOUND_PROXY_HOSTS: "sni-probe.invalid" }, async () => {
        let message = null;
        try {
            await fetchSafely("https://sni-probe.invalid/v1/models");
        } catch (error) {
            message = String(error?.message ?? error);
        }
        assert.ok(message !== null, "截获方不做 TLS 握手，请求应当失败");
        assert.ok(!message.includes("出站代理拒绝隧道"), `CONNECT 本身应成功，实际「${message}」`);
    });
    assert.strictEqual(sniProxy.hits.length, before + 1, "应恰好经代理一次");
    assert.strictEqual(sniProxy.hits.at(-1).requestLine, "CONNECT sni-probe.invalid:443 HTTP/1.1", "https 目标必须 CONNECT 到 443");
    assert.ok(capture.state.bytes.length > 5, "隧道内应发出 TLS 握手字节");
    assert.strictEqual(capture.state.bytes[0], 0x16, "隧道内首字节应是 TLS handshake 记录");
    assert.ok(capture.state.bytes.includes("sni-probe.invalid"), "ClientHello 的 SNI 必须是真实域名（决定证书校验对象）");
});

await check("代理拒绝隧道时给出可读错误", async () => {
    await withEnv({ OUTBOUND_PROXY_URL: `http://127.0.0.1:${rejectProxy.port}`, OUTBOUND_PROXY_HOSTS: "proxied.invalid" }, async () => {
        await rejectsWith("407", () => fetchSafely("https://proxied.invalid/v1/models"), "出站代理拒绝隧道（HTTP 407）");
    });
});

await check("代理不可达时报连接错误，而不是静默直连", async () => {
    await withEnv({ OUTBOUND_PROXY_URL: `http://127.0.0.1:${deadPort}`, OUTBOUND_PROXY_HOSTS: "proxied.invalid" }, async () => {
        await rejectsWith("ECONNREFUSED", () => fetchSafely("https://proxied.invalid/v1/models"), "ECONNREFUSED");
    });
});

await check("白名单是域名边界匹配：兄弟域与后缀攻击都不得命中", async () => {
    const before = proxy.hits.length;
    await withEnv({ OUTBOUND_PROXY_URL: PROXY_URL, OUTBOUND_PROXY_HOSTS: "apimart.ai" }, async () => {
        // 子域命中：不做本地 DNS，直接经代理成功
        const ok = await fetchSafely(`http://api.apimart.ai:${originPort}/v1/models`);
        assert.strictEqual(ok.status, 200);
        // 兄弟域 / 后缀攻击：不命中 → 退回直连 → 本地解析失败
        await rejectsWith("evilapimart.ai", () => fetchSafely("http://evilapimart.ai/v1/models"), "目标域名解析失败");
        await rejectsWith("apimart.ai.evil.invalid", () => fetchSafely("http://apimart.ai.evil.invalid/v1/models"), "目标域名解析失败");
    });
    assert.strictEqual(proxy.hits.length, before + 1, "只有 api.apimart.ai 该走代理");
});

await check("代理配置非法时明确报错，不静默忽略", async () => {
    await withEnv({ OUTBOUND_PROXY_URL: "socks5://127.0.0.1:1080", OUTBOUND_PROXY_HOSTS: "proxied.invalid" }, async () => {
        await rejectsWith("socks5", () => fetchSafely("https://proxied.invalid/v1/models"), "出站代理配置非法");
    });
});

origin.close();
proxy.server.close();
rejectProxy.server.close();
sniProxy.server.close();
capture.server.close();

// —— 多地址并发抢连（2026-09-18：getapib.org 三个地址里一个是黑洞，串行换址让一张图要 32 秒）——
// 规则收在常量里：单个地址的建连时限必须有界（否则全黑洞的域名会挂到内核 SYN 重试跑完，约 127 秒），
// 错峰间隔要足够小（否则「抢」就退化成串行）。真正的抢连行为在线上用真实图床验证过（32 秒 → 1 秒）。
await check("抢连参数：建连时限有界、错峰间隔足够小", () => {
    assert.ok(CONNECT_ATTEMPT_TIMEOUT_MS > 0 && CONNECT_ATTEMPT_TIMEOUT_MS <= 15_000, `单个地址建连时限必须在 15 秒内，实际 ${CONNECT_ATTEMPT_TIMEOUT_MS}`);
    assert.ok(CONNECT_RACE_STAGGER_MS > 0 && CONNECT_RACE_STAGGER_MS <= 500, `错峰间隔必须不超过 500ms，实际 ${CONNECT_RACE_STAGGER_MS}`);
    assert.ok(CONNECT_RACE_STAGGER_MS < CONNECT_ATTEMPT_TIMEOUT_MS, "错峰间隔必须小于建连时限，否则后面的地址还没开始就先输了");
});

console.log(failures.length === 0 ? `\n全部通过：${passed} 项` : `\n通过 ${passed} 项，失败 ${failures.length} 项：${failures.join("、")}`);
