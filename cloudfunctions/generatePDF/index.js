const cloud = require('wx-server-sdk');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const fontkit = require('fontkit');

cloud.init();

exports.main = async (event) => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([600, 800]); // 使用 let 以便更新页面引用
  
  // 加载简体中文字体（确保文件存在）
  const fontPath = path.join(__dirname, 'SourceHanSansOLD-Medium-2.otf');
  const fontBytes = fs.readFileSync(fontPath);
  
  pdfDoc.registerFontkit(fontkit);
  // 嵌入字体子集以减小体积
  const regularFont = await pdfDoc.embedFont(fontBytes);

  const { name, email, phone, education, work_experience, projects, skills, honors } = event.resumeData;

  let yPosition = 750;
  const lineHeight = 30;
  const margin = 50;
  const maxWidth = 500; // 有效内容区域宽度

  // 改进的自动换行和分页处理
  const addText = (text, size) => {
    const paragraphs = text.split('\n');
    
    paragraphs.forEach(paragraph => {
      let currentLine = '';
      
      // 按字符处理换行
      for (const char of paragraph) {
        const testLine = currentLine + char;
        const testWidth = regularFont.widthOfTextAtSize(testLine, size);
        
        if (testWidth > maxWidth) {
          // 绘制当前行
          drawLine(currentLine, size);
          currentLine = char; // 新行以当前字符开始
        } else {
          currentLine = testLine;
        }
      }
      
      // 绘制剩余内容
      if (currentLine) {
        drawLine(currentLine, size);
      }
    });
  };

  // 处理实际绘制和分页
  const drawLine = (text, size) => {
    // 检查是否需要换页
    if (yPosition < margin + lineHeight) {
      page = pdfDoc.addPage([600, 800]);
      yPosition = 750;
    }
    
    page.drawText(text, {
      x: margin,
      y: yPosition,
      size,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
  };


  // 添加个人信息
  addText(`姓名: ${name}`, 24);
  addText(`邮箱: ${email}`, 24);
  addText(`电话: ${phone}`, 24);

  // 添加教育经历
  addText('教育经历:', 28);
  if (education) {
    addText(`学校: ${education.school}`, 20);
    addText(`专业: ${education.major}`, 20);
    addText(`时间: ${education.duration}`, 20);
    addText(`主修课程: ${education.courses.join(', ')}`, 20);
  }

  // 添加工作经历
  addText('工作经历:', 28);
  work_experience.forEach((work, index) => {
    addText(`${index + 1}. ${work.company} | ${work.position} | ${work.years}`, 20);
    addText(`   ${work.details}`, 18);
  });

  // 添加项目经历
  addText('项目经历:', 28);
  projects.forEach((project, index) => {
    addText(`${index + 1}. ${project.name}`, 20);
    addText(`   技术栈: ${project.tech}`, 18);
    addText(`   项目成果: ${project.results}`, 18);
  });

  // 添加技能特长
  addText('技能特长:', 28);
  skills.forEach((skill, index) => {
    addText(`${index + 1}. ${skill}`, 20);
  });

  // 添加荣誉部分
  addText('荣誉:', 28);
  honors.forEach((honor, index) => {
    addText(`${index + 1}. ${honor}`, 20);
  });

  // 生成PDF
  const pdfBytes = await pdfDoc.save();
  const fileName = `resume_${Date.now()}.pdf`;
  const cloudPath = `resumes/${fileName}`;

  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const taskId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 创建初始任务记录
  await db.collection('pdf_tasks').add({
    data: {
      taskId,
      status: 'processing',
      createTime: db.serverDate(),
      cloudPath,
      fileID: '',
      envId: wxContext.ENV_ID
    }
  });

  // 异步处理文件上传
  processUpload(taskId, cloudPath, pdfBytes);

  return {
    success: true,
    taskId
  };
};

// 异步处理文件上传
async function processUpload(taskId, cloudPath, pdfBytes) {
  const db = cloud.database();
  try {
    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath,
      fileContent: Buffer.from(pdfBytes),
    });

    
    // 更新任务状态
    await db.collection('pdf_tasks').where({taskId}).update({
      data: {
        status: 'completed',
        fileID: uploadResult.fileID,
        updateTime: db.serverDate()
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    await db.collection('pdf_tasks').where({taskId}).update({
      data: {
        status: 'failed',
        error: error.message,
        updateTime: db.serverDate()
      }
    });
  }
}
