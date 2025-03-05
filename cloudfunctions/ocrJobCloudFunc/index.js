const cloud = require('wx-server-sdk');
const axios = require('axios');
const URLSearchParams = require('url').URLSearchParams; // 引入 URLSearchParams

cloud.init();

const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';
const API_KEY_1 = 'K85981020188957'; // 替换为你的第一个 API 密钥
const API_KEY_2 = '8280cebb0488957'; // 替换为你的第二个 API 密钥

exports.main = async (event, context) => {
  if (!event.fileID) {
    return { error: "fileID 不能为空" };
  }

  try {
    // 1. 获取云存储临时 URL
    const tempUrlRes = await cloud.getTempFileURL({
      fileList: [event.fileID]
    });
    const tempUrl = tempUrlRes.fileList[0].tempFileURL;

    // 2. 构建 URLSearchParams 对象
    const apiKey = Math.random() < 0.5 ? API_KEY_1 : API_KEY_2; // 随机选择 API 密钥
    const params = new URLSearchParams();
    params.append('apikey', apiKey);
    params.append('url', tempUrl);
    params.append('language', 'chs');
    params.append('filetype', 'JPG');

    // 3. 调用 OCR.Space API 识别，并设置 Content-Type
    const response = await axios.post(OCR_SPACE_API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // 4. 解析返回结果 (与之前代码相同)
    let text = "";
    if (response.data && !response.data.IsErroredOnProcessing) {
      if (response.data.ParsedResults && response.data.ParsedResults.length > 0) { // 增加判断 ParsedResults 是否存在
        text = response.data.ParsedResults[0].ParsedText;
      }
    }

    // 如果没有识别到文字，返回提示信息
    if (!text) {
      return { error: "未能识别到文字内容" };
    }

    // 5. 删除云文件
    await cloud.deleteFile({
      fileList: [event.fileID]
    });

    return { text: text };
  } catch (err) {
    console.error("OCR 识别失败:", err);
    return { error: String(err.message) };
  }
};