// 云函数入口文件
const cloud = require('wx-server-sdk');
const axios = require('axios');

// 初始化云开发环境
cloud.init();

// 阿里云 OCR API 配置
const ALIYUN_HOST = "https://gjbsb.market.alicloudapi.com";
const ALIYUN_PATH = "/ocrservice/advanced";
const APPCODE = "cd19e7da958b4473af546c7e8a3ecb84";  // 需要替换成你自己的 APPCODE

exports.main = async function(event, context) {
  if (!event.fileID) {
    return { error: "fileID 不能为空" };
  }

  try {
    // 1. 下载云存储文件
    const res = await cloud.downloadFile({
      fileID: event.fileID
    });
    const buffer = res.fileContent;
    
    // 将图片转为base64
    const base64Img = buffer.toString('base64');

    // 2. 调用阿里云 OCR 识别
    const requestData = JSON.stringify({
      img: base64Img,
      url: "",
      prob: false,
      charInfo: false,
      rotate: false,
      table: false
    });

    const headers = {
      "Authorization": `APPCODE ${APPCODE}`,
      "Content-Type": "application/json; charset=UTF-8"
    };

    const response = await axios({
      method: 'post',
      url: ALIYUN_HOST + ALIYUN_PATH,
      headers: headers,
      data: requestData
    });

    // 3. 解析返回结果
    var text = "";
    if (response.data && response.data.prism_wordsInfo) {
      text = response.data.prism_wordsInfo.map(function(item) {
        return item.word;
      }).join("\n");
    }

    // 如果没有识别到文字，返回提示信息
    if (!text) {
      return { error: "未能识别到文字内容" };
    }

    return { text: text };
  } catch (err) {
    console.error("OCR 识别失败:", err);
    return { error: String(err.message) };
  }
};
