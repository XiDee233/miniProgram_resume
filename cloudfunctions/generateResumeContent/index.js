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

    // 创建初始任务记录
    await db.collection('ai_tasks').add({
      data: {
        taskId,
        status: 'processing',
        createTime: db.serverDate(),
        jobDescription: event.jobDescription,
        currentContent: '', // 新增：当前生成的内容
        totalTokens: 0,    // 新增：当前生成的字数
      }
    });

    // 异步处理流式请求
    processStreamRequest(taskId, event.jobDescription, systemPrompt);

    return {
      success: true,
      taskId
    };

  } catch (err) {
    console.error('云函数执行失败:', err);
    return { success: false, error: err.message };
  }
};

// 处理流式请求
async function processStreamRequest(taskId, jobDescription, systemPrompt) {
  const db = cloud.database();
  
  try {
    const apiKey = '1d22e409-2370-417f-9c4c-1eadf76ec7de';
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    });

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
            await db.collection('ai_tasks').where({
              taskId: taskId
            }).update({
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
    await db.collection('ai_tasks').where({
      taskId: taskId
    }).update({
      data: {
        status: 'completed',
        result: fullContent,
        currentContent: fullContent,
        totalTokens: fullContent.length,
        updateTime: db.serverDate()
      }
    });

  } catch (error) {
    console.error('流式生成失败:', error);
    await db.collection('ai_tasks').where({
      taskId: taskId
    }).update({
      data: {
        status: 'failed',
        error: error.message,
        updateTime: db.serverDate()
      }
    });
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


