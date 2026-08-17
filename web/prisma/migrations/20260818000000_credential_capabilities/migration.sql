-- 平台模型能力标定：ProviderCredential 增加 capabilities（Json，按模型名存放能力规格）
-- 与前端设置面板一一对应：图片（画质/宽高比/张数）、Seedance（分辨率/比例/时长/声音/水印）、通用视频（清晰度/尺寸/秒数）
ALTER TABLE "ProviderCredential" ADD COLUMN "capabilities" JSONB;
