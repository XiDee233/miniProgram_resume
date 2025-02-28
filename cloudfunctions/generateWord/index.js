const cloud = require('wx-server-sdk');
const docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const uuid = require('uuid'); // 用于生成任务 ID
const ImageModule = require('open-docxtemplater-image-module'); // 引入图片模块
const path = require('path'); // 引入路径模块
const os = require('os'); // 引入 os 模块
const fs = require('fs');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event) => {
  const taskId = uuid.v4();
  const db = cloud.database();

  // 1. 记录任务状态
  await db.collection('word_tasks').add({
    data: {
      _id: taskId,
      status: 'processing'
    }
  });

  // 2. 异步执行生成操作
  await generateWord(taskId, event.resumeData); // 传递简历数据

  // 3. 立即返回任务 ID
  return { taskId };
};

async function generateWord(taskId, resumeData) {
  try {
    // 1. 从云存储下载模板文件
    const templateRes = await cloud.downloadFile({
      fileID: 'cloud://sybcloud1-6g6f3534e3ef9bb9.7379-sybcloud1-6g6f3534e3ef9bb9-1344626996/template/template03.docx', // 替换为你的模板文件 ID
    });
    const templateBuffer = templateRes.fileContent;
    const zip = new PizZip(templateBuffer);

    const opts = {
        centered: false,
        fileType: "docx",
        getImage: function(tagValue, tagName) {
            console.log('getImage called with tagValue:', tagValue, 'tagName:', tagName);
            try {
                const imageBuffer = fs.readFileSync(tagValue); // 读取临时图片文件
                console.log('Image read successfully');
                return imageBuffer;
            } catch (error) {
                console.error('Error reading image file:', error);
                return null; // 返回 null 或者处理错误
            }
        },
        getSize: function(img, tagValue, tagName) {
            return [96, 128]; // 返回图片的宽高
        }
    };

    const imageModule = new ImageModule(opts);

    // 3. 创建 Docxtemplater 实例并传入图片模块


         // **---  图片下载和临时文件处理  ---**
    const cloudImageUrl = 'cloud://sybcloud1-6g6f3534e3ef9bb9.7379-sybcloud1-6g6f3534e3ef9bb9-1344626996/images/微信图片_20250218204349.jpg'; // 云存储图片 URL
    let localImagePath = ''; // 本地临时文件路径
 
    if (cloudImageUrl) {
       try {
           console.log(`开始下载云图片: ${cloudImageUrl}`);
           const imageRes = await cloud.downloadFile({
               fileID: cloudImageUrl,
           });
           const imageBuffer = imageRes.fileContent;
   
           // 使用 os.tmpdir() 获取操作系统临时目录，并拼接文件名
           const tempFilePath = path.join(os.tmpdir(), `resume_image_${Date.now()}.jpg`); // 修正: 使用 path.join
   
           fs.writeFileSync(tempFilePath, imageBuffer);
           localImagePath = tempFilePath;
           console.log(`云图片下载成功，保存到临时文件: ${localImagePath}`);
   
       } catch (error) {
           console.error('下载云图片失败:', error);
           localImagePath = ''; // 下载失败，本地路径为空
           //  您可以选择抛出错误或者使用默认图片，这里选择将 localImagePath 设为空，表示不插入图片
       }
   }

   const doc = new docxtemplater()
   .attachModule(imageModule) // 附加图片模块
   .loadZip(zip)
   .setData({
    name: resumeData.name,
    age: resumeData.age,
    gender: resumeData.gender,
    email: resumeData.email,
    phone: resumeData.phone,
    school: resumeData.education.school,
    major: resumeData.education.major,
    duration: resumeData.education.duration,
    courses: resumeData.education.courses,
    work_experience: resumeData.work_experience.map((work, index) => ({
      index: index + 1,
      company: work.company,
      position: work.position,
      years: work.years,
      details: work.details
    })),
    projects: resumeData.projects.map((project, index) => ({
      index: index + 1,
      name: project.name,
      tech: project.tech,
      results: project.results
    })),
    skills: resumeData.skills,
    honors: resumeData.honors,
    image:localImagePath
  });
    // 使用 setData 函数设置数据


    // 4. 生成文档
    doc.render();

    // 5. 上传文件到云存储
    const outputBuffer = doc.getZip().generate({ type: 'nodebuffer' });
    const timestamp = Date.now();
    const fileName = `resume_${timestamp}.docx`; // 生成的文件名
    const uploadRes = await cloud.uploadFile({
      cloudPath: `resumes/${fileName}`,
      fileContent: outputBuffer,
    });

    // 6. 更新任务状态为"已完成"
    await cloud.database().collection('word_tasks').doc(taskId).update({
      data: { status: 'completed', fileID: uploadRes.fileID }
    });

  } catch (e) {
    console.error(e);
    // 更新任务状态为"失败"
    await cloud.database().collection('word_tasks').doc(taskId).update({
      data: { status: 'failed', error: e.message }
    });
  }
}
