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

export async function sendSmsVerifyCode(phoneNumber: string): Promise<{ ok: boolean; bizId?: string; code?: string; error?: string }> {
    const client = getClient();
    if (!client) return { ok: false, error: "短信服务未配置" };

    const signName = process.env.ALIYUN_SMS_SIGN_NAME || "速通互联验证码";
    const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || "100001";

    try {
        const req = new Dysmsapi.SendSmsVerifyCodeRequest({
            // 号码认证服务要求手机号带国家码前缀（官方示例 86130****0000）
            phoneNumber: `86${phoneNumber}`,
            signName,
            templateCode,
            // 验证码由阿里云生成并写入短信，模板变量用 ##code## 占位；
            // min 为模板内的 ${min} 变量（"有效期${min}分钟"），缺失会报"模板内容与模板参数不匹配"；
            // returnVerifyCode: true 让响应把生成的验证码带回，由我方落库验证。
            // （若把真实验证码值填进 templateParam，阿里云内部生成流程会失败，返回 UNKNOWN）
            templateParam: JSON.stringify({ code: "##code##", min: "5" }),
            validTime: 300,
            codeLength: 6,
            returnVerifyCode: true,
        });
        const res = await client.sendSmsVerifyCode(req);
        if (res.body.code === "OK") {
            const code = res.body.model?.verifyCode;
            if (!code) return { ok: false, error: "阿里云未返回验证码" };
            return { ok: true, bizId: res.body.model?.bizId, code };
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
