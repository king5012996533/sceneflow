import * as Dysmsapi from "@alicloud/dypnsapi20170525";
import * as OpenApi from "@alicloud/openapi-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Client = (Dysmsapi as any).default;

function getClient() {
    const akId = process.env.ALIYUN_SMS_ACCESS_KEY_ID || "";
    const akSecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || "";
    if (!akId || !akSecret) return null;
    return new Client(
        new OpenApi.Config({
            accessKeyId: akId,
            accessKeySecret: akSecret,
            endpoint: "dypnsapi.aliyuncs.com",
        }),
    );
}

export async function sendSmsVerifyCode(phoneNumber: string, code: string): Promise<{ ok: boolean; bizId?: string; error?: string }> {
    const client = getClient();
    if (!client) return { ok: false, error: "短信服务未配置" };

    const signName = process.env.ALIYUN_SMS_SIGN_NAME || "速通互联验证码";
    const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || "100001";

    try {
        const req = new Dysmsapi.SendSmsVerifyCodeRequest({
            phoneNumber,
            signName,
            templateCode,
            templateParam: JSON.stringify({ code, min: "5" }),
            validTime: 300,
        });
        const res = await client.sendSmsVerifyCode(req);
        if (res.body.code === "OK") {
            return { ok: true, bizId: res.body.bizId };
        }
        return { ok: false, error: res.body.message || res.body.code };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "短信发送失败";
        return { ok: false, error: message };
    }
}

export async function checkSmsVerifyCode(phoneNumber: string, verifyCode: string): Promise<{ ok: boolean; error?: string }> {
    const client = getClient();
    if (!client) return { ok: false, error: "短信服务未配置" };

    try {
        const req = new Dysmsapi.CheckSmsVerifyCodeRequest({
            phoneNumber,
            verifyCode,
        });
        const res = await client.checkSmsVerifyCode(req);
        const model = res.body.model as { verifyResult?: string } | undefined;
        if (res.body.code === "OK" && (!model?.verifyResult || model.verifyResult === "PASS")) {
            return { ok: true };
        }
        return { ok: false, error: model?.verifyResult || res.body.message || res.body.code };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "验证码校验失败";
        return { ok: false, error: message };
    }
}
