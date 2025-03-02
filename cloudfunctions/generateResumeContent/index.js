const cloud = require('wx-server-sdk');
const OpenAI = require('openai');  // 修改引入方式

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('云函数开始执行，接收参数:', event);
  const db = cloud.database();
  
  try {
    if (!event || !event.jobDescription) {
      return { success: false, error: '缺少职位描述参数' };
    }

    const systemPrompt = await getSystemPromptFromStorage();
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const apiKey = await getApiKeyFromDatabase();
    if (!apiKey) {
      const defaultContent = await getDefaultContentFromStorage();
      await db.collection('gen_tasks').add({
        data: {
          _id: taskId,
          status: 'completed', 
          createTime: db.serverDate(),
          jobDescription: event.jobDescription,
          currentContent: defaultContent, // 使用默认内容
          totalTokens: defaultContent.length, // 设置字数
        }
      });
      return { success: true, taskId };
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    });

    // 创建初始任务记录
    await db.collection('gen_tasks').add({
      data: {
        _id: taskId,
        status: 'processing',
        createTime: db.serverDate(),
        jobDescription: event.jobDescription,
        currentContent: '', // 新增：当前生成的内容
        totalTokens: 0,    // 新增：当前生成的字数
      }
    });

    // 异步处理流式请求
    processStreamRequest(taskId, event.jobDescription, systemPrompt, openai);

    return {
      success: true,
      taskId
    };

  } catch (err) {
    console.error('云函数执行失败:', err);
    return { success: false, error: err.message };
  }
};

// 从云数据库获取 API 密钥
async function getApiKeyFromDatabase() {
  const db = cloud.database();
  const result = await db.collection('keys').doc("1c5ac29f67c3bb4600311a493a34ede8").get(); // 替换为实际文档ID
  return result.data ? result.data.theKey : null; // 假设 apiKey 存储在 data.apiKey 中
}

// 从云存储获取默认内容
async function getDefaultContentFromStorage() {
  try {
    const result = await cloud.downloadFile({
      fileID: 'cloud://sybcloud1-6g6f3534e3ef9bb9.7379-sybcloud1-6g6f3534e3ef9bb9-1344626996/defaultJson.txt' // 替换为实际的文件路径
    });
    
    const buffer = result.fileContent;
    return buffer.toString('utf8'); // 返回默认内容
  } catch (error) {
    console.error('读取默认内容失败:', error);
    return ''; // 返回空字符串作为默认内容
  }
}

// 处理流式请求
async function processStreamRequest(taskId, jobDescription, systemPrompt, openai) {
  const db = cloud.database();
  
  try {
    const stream = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: jobDescription
        }
      ],
      model: 'doubao-1-5-pro-32k-250115',
      stream: true, // 启用流式响应
    });

    let fullContent = '';
    let updateTimer = null;
    const batchSize = 50; // 每50个字符更新一次数据库

    // 处理流式响应
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        
        // 使用防抖更新数据库
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(async () => {
          try {
            await db.collection('gen_tasks').doc(taskId).update({
              data: {
                currentContent: fullContent,
                totalTokens: fullContent.length,
                updateTime: db.serverDate()
              }
            });
          } catch (error) {
            console.error('更新进度失败:', error);
          }
        }, 200); // 200ms 防抖
      }
    }

    // 最终更新
    await db.collection('gen_tasks').doc(taskId).update({
      data: {
        status: 'completed',
        currentContent: fullContent,
        totalTokens: fullContent.length,
        updateTime: db.serverDate()
      }
    });

  } catch (error) {
    console.error('流式生成失败:', error);
    
    // 获取默认内容
    const defaultContent = await getDefaultContentFromStorage();
    
    // 更新任务记录为失败并使用默认内容
    await db.collection('gen_tasks').doc(taskId).update({
      data: {
        status: 'failed',
        error: error.message,
        currentContent: defaultContent, // 使用默认内容
        totalTokens: defaultContent.length, // 设置字数
        updateTime: db.serverDate()
      }
    });
  } finally {
    // 这里可以添加任何需要在结束时执行的清理代码
  }
}

// 从云存储读取 system 提示词
async function getSystemPromptFromStorage() {
  try {
    const result = await cloud.downloadFile({
      fileID: 'cloud://sybcloud1-6g6f3534e3ef9bb9.7379-sybcloud1-6g6f3534e3ef9bb9-1344626996/systemPrompt.txt'
    });
    
    // 将文件内容转换为字符串
    const buffer = result.fileContent;
    const systemPrompt = buffer.toString('utf8');
    return systemPrompt;
  } catch (error) {
    console.error('读取 system 提示词失败:', error);
    // 如果读取失败，返回默认提示词
    return null
  }
}
