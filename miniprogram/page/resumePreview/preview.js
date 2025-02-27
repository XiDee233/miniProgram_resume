// 移除 Babel 运行时相关的导入
// var _toConsumableArray2 = require("../../@babel/runtime/helpers/toConsumableArray");

Page({
  data: {
    resumeData: {
      education: {
        courses: []
      },
      skills: [],
      honors: []
    },
    activeTab: "preview",
    pdfUrl: "",
    isModified: false,
    isGenerating: false
  },

  onLoad: function (options) {
    try {
      if (options && options.data) {
        // 检查数据是否需要解码
        let jsonStr = options.data;
        if (jsonStr.startsWith('%')) {
          jsonStr = decodeURIComponent(jsonStr);
        }

        // 尝试解析 JSON
        let resumeData = null;
        try {
          resumeData = JSON.parse(jsonStr);
        } catch (e) {
          console.error('JSON parse error:', e);
          resumeData = {
            education: {
              courses: []
            },
            skills: [],
            honors: []
          };
        }

        // 确保数据结构完整
        if (!resumeData.education) {
          resumeData.education = { courses: [] };
        }
        if (!resumeData.education.courses) {
          resumeData.education.courses = [];
        }
        if (!resumeData.skills) {
          resumeData.skills = [];
        }
        if (!resumeData.honors) {
          resumeData.honors = [];
        }

        this.setData({
          resumeData: resumeData
        });
      } else {
        // 如果没有传入数据，初始化默认结构
        this.setData({
          resumeData: {
            education: {
              courses: []
            },
            skills: [],
            honors: []
          }
        });
      }
    } catch (error) {
      console.error('onLoad error:', error);
      // 发生错误时设置默认数据
      this.setData({
        resumeData: {
          education: {
            courses: []
          },
          skills: [],
          honors: []
        }
      });
    }
  },

  // 简化后的数组处理方法
  updateArray: function (arrayPath, index, value) {
    const pathParts = arrayPath.split('.');
    let current = this.data;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }

    const arrayName = pathParts[pathParts.length - 1];
    const array = current[arrayName] || [];

    if (typeof index === 'number') {
      array[index] = value;
    } else {
      array.push(value || '');
    }

    const updateObj = {};
    updateObj[arrayPath] = array;
    updateObj.isModified = true;
    this.setData(updateObj);
  },

  removeArrayItem: function (arrayPath, index) {
    const pathParts = arrayPath.split('.');
    let current = this.data;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }

    const arrayName = pathParts[pathParts.length - 1];
    const array = current[arrayName];
    array.splice(index, 1);

    const updateObj = {};
    updateObj[arrayPath] = array;
    updateObj.isModified = true;
    this.setData(updateObj);
  },

  // 基础字段修改
  onFieldChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;

    this.setData({
      [`resumeData.${field}`]: value,
      isModified: true
    });
  },

  // 教育信息修改
  onEducationChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;

    this.setData({
      [`resumeData.education.${field}`]: value,
      isModified: true
    });
  },

  // 课程修改
  onCourseChange: function (e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    this.updateArray('resumeData.education.courses', index, value);
  },

  // 工作经历修改
  onWorkChange(e) {
    const { field, index } = e.currentTarget.dataset;
    const { value } = e.detail;

    this.setData({
      [`resumeData.work_experience[${index}].${field}`]: value,
      isModified: true
    });
  },

  // 添加工作经历
  addWork() {
    const work_experience = this.data.resumeData.work_experience || [];
    work_experience.push({
      company: '',
      position: '',
      years: '',
      details: ''
    });

    this.setData({
      'resumeData.work_experience': work_experience,
      isModified: true
    });
  },

  // 删除工作经历
  deleteWork(e) {
    const { index } = e.currentTarget.dataset;
    const work_experience = this.data.resumeData.work_experience;
    work_experience.splice(index, 1);

    this.setData({
      'resumeData.work_experience': work_experience,
      isModified: true
    });
  },

  // 保存简历
  saveResume: function () {
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    prevPage.setData({
      resumeData: this.data.resumeData
    });
    wx.navigateBack();
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  editSection(e) {
    const type = e.currentTarget.dataset.type;
    // 显示编辑弹窗
    this.setData({
      editingSection: type
    });
  },

  adjustResume(e) {
    const type = e.currentTarget.dataset.type;
    wx.showLoading({ title: '正在优化...' });
    wx.cloud.callFunction({
      name: "adjustResume",
      data: {
        resumeData: this.data.resumeData,
        type
      },
      success: (res) => {
        if (res.result.success) {
          this.setData({ resumeData: res.result.data });
          wx.showToast({
            title: '优化完成',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.result.error || '优化失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('调用优化函数失败:', err);
        wx.showToast({
          title: '优化失败，请重试',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },


  copyPlainText() {
    // 将简历数据转换为纯文本格式
    const plainText = this.formatResumeToText();
    wx.setClipboardData({
      data: plainText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  formatResumeToText() {
    const data = this.data.resumeData;
    let text = '';

    // 基本信息
    text += `姓名：${data.name}\n`;
    text += `年龄：${data.age}\n`;
    text += `性别：${data.gender}\n`;
    text += `电话：${data.phone}\n`;
    text += `邮箱：${data.email}\n\n`;

    // 教育经历
    text += `教育经历\n`;
    text += `学校：${data.education.school}\n`;
    text += `专业：${data.education.major}\n`;
    text += `时间：${data.education.duration}\n`;
    text += `主修课程：${data.education.courses.join('、')}\n\n`;

    // 工作经历
    text += `工作经历\n`;
    data.work_experience.forEach((work, index) => {
      text += `${index + 1}. ${work.company} | ${work.position} | ${work.years}\n`;
      text += `   ${work.details}\n\n`;
    });

    // 项目经历
    text += `项目经历\n`;
    data.projects.forEach((project, index) => {
      text += `${index + 1}. ${project.name}\n`;
      text += `   技术栈：${project.tech}\n`;
      text += `   项目成果：${project.results}\n\n`;
    });

    // 技能特长
    text += `技能特长\n`;
    data.skills.forEach((skill, index) => {
      text += `${index + 1}. ${skill}\n`;
    });

    return text;
  },

  previewPDF() {
    this.setData({ isGenerating: true });

    wx.showToast({
      title: '正在生成PDF，请稍候...',
      icon: 'none'
    });

    // 调用云函数生成PDF
    wx.cloud.callFunction({
      name: 'generatePDF',
      data: {
        resumeData: this.data.resumeData
      },
      success: (res) => {
        if (res.result.success) {
          // 使用完整的文件ID进行轮询检查
          this.checkFileUpload(res.result.taskId);
        } else {
          this.setData({ isGenerating: false });
          wx.showToast({
            title: '生成失败，请重试',
            icon: 'none'
          });
        }
      },
      fail: (res) => {
        console.log(res)
        this.setData({ isGenerating: false });
        wx.showToast({
          title: '生成失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  checkFileUpload(taskId) {
    const db = wx.cloud.database();
    let attempts = 0;
    const maxAttempts = 30; // 最大尝试次数 30次*2秒=60秒超时

    const checkInterval = setInterval(async () => {
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        this.setData({ isGenerating: false });
        wx.showToast({ title: '请求超时，请重试', icon: 'none' });
        return;
      }
      attempts++;
console.log('pdf轮询'+attempts)
      try {
        const { data } = await db.collection('pdf_tasks')
          .where({ taskId: taskId })
          .get();

        if (data.length > 0) {
          const task = data[0];
          if (task.status === 'completed') {
            clearInterval(checkInterval);
            this.setData({
              pdfUrl: task.fileID,
              isGenerating: false
            });
            this.fallbackDownload(task.fileID);

          } else if (task.status === 'failed') {
            clearInterval(checkInterval);
            this.setData({ isGenerating: false });
            wx.showToast({ title: '文件生成失败', icon: 'none' });
          }
        }
      } catch (err) {
        console.error('查询任务状态失败:', err);
        clearInterval(checkInterval);
        this.setData({ isGenerating: false });
        wx.showToast({ title: '查询状态失败', icon: 'none' });
      }
    }, 2000); // 每2秒检查一次
  },

  // 备用下载方案
  fallbackDownload(fileID) {
    wx.showModal({
      title: '提示',
      content: '自动打开失败，是否尝试手动下载？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.downloadFile({
            fileID: fileID,
            success: (downloadRes) => {
              wx.openDocument({
                filePath: downloadRes.tempFilePath,
                fileType: 'pdf'
              });
            },
            fail: (downloadErr) => {
              console.log(downloadErr);
              wx.showToast({
                title: '下载失败，请稍后再试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  exaggerateResume() {
    wx.showToast({
      title: '敬请期待',
      icon: 'none'
    });
  },

  optimizeResume() {
    wx.showLoading({ title: '优化中...' });
    // ... 原有的简历优化逻辑 ...
  },

  // 项目经历修改
  onProjectChange(e) {
    const { field, index } = e.currentTarget.dataset;
    const { value } = e.detail;

    this.setData({
      [`resumeData.projects[${index}].${field}`]: value,
      isModified: true
    });
  },

  // 添加项目经历
  addProject() {
    const projects = this.data.resumeData.projects || [];
    projects.push({
      name: '',
      tech: '',
      results: ''
    });

    this.setData({
      'resumeData.projects': projects,
      isModified: true
    });
  },

  // 删除项目经历
  deleteProject(e) {
    const { index } = e.currentTarget.dataset;
    const projects = this.data.resumeData.projects;
    projects.splice(index, 1);

    this.setData({
      'resumeData.projects': projects,
      isModified: true
    });
  },

  // 技能相关方法
  onSkillChange: function (e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    this.updateArray('resumeData.skills', index, value);
  },

  addSkill: function () {
    this.updateArray('resumeData.skills');
  },

  deleteSkill: function (e) {
    const index = e.currentTarget.dataset.index;
    this.removeArrayItem('resumeData.skills', index);
  },

  // 课程相关方法
  addCourse: function () {
    this.updateArray('resumeData.education.courses');
  },

  deleteCourse: function (e) {
    const index = e.currentTarget.dataset.index;
    this.removeArrayItem('resumeData.education.courses', index);
  },

  // 荣誉信息修改
  onHonorChange(e) {
    const { index } = e.currentTarget.dataset;
    const { value } = e.detail;

    this.setData({
      [`resumeData.honors[${index}]`]: value,
      isModified: true
    });
  },

  // 添加荣誉
  addHonor() {
    const honors = this.data.resumeData.honors || [];
    honors.push('');

    this.setData({
      'resumeData.honors': honors,
      isModified: true
    });
  },

  // 删除荣誉
  deleteHonor(e) {
    const { index } = e.currentTarget.dataset;
    const honors = this.data.resumeData.honors;
    honors.splice(index, 1);

    this.setData({
      'resumeData.honors': honors,
      isModified: true
    });
  },

  downloadPDF() {
    if (!this.data.pdfUrl) {
      wx.showToast({
        title: '请先生成PDF',
        icon: 'none'
      });
      return;
    }

    wx.downloadFile({
      url: this.data.pdfUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: 'pdf',
            success: () => {
              wx.showToast({
                title: '下载成功',
                icon: 'success'
              });
            },
            fail: () => {
              wx.showToast({
                title: '打开失败',
                icon: 'none'
              });
            }
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  },
});
