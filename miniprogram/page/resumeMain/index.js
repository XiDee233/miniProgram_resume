Page({
  data: {
    imageUrl: "",
    jobDescription: "",
    currentLength: 0,
    showExampleModal: false,
    showGuideModal: false,
    defaultResumeData: {
      "name": "张强",
      "age": 26,
      "gender": "男",
      "phone": "178××××5678",
      "email": "zhangxx@tutanota.com",
      "education": {
      "school": "北京理工大学",
      "major": "数字媒体技术",
      "duration": "2017.09-2021.06",
      "courses": ["3D 建模与动画", "游戏引擎原理", "计算机图形学", "数字图像处理", "虚拟现实技术"]
      },
      "honors": ["CET-4", "全国大学生创新创业大赛一等奖", "OpenCV比赛三等奖", "雅思6.0"],
      "work_experience": [
      {
      "years": "2021.07-2022.08",
      "company": "北京幻想游戏",
      "position": "Unity 场景美术师",
      "details": "独立完成 3D 场景制作，在 Unity 引擎中构建并编辑场景，布置灯光并烘焙灯光贴图，成功营造出多个游戏场景的效果和气氛。负责制作包括普通和 PBR 材质的场景模型和贴图，提升了场景的视觉表现。对场景进行优化调整，控制场景性能和最终效果，使游戏运行更加流畅。参与二次元风格场景设计，对二次元风格有深刻理解，提升了场景的沉浸感。"
      },
      {
      "years": "2020.07-2021.06",
      "company": "北京幻想游戏",
      "position": "Unity 场景美术实习生",
      "details": "协助完成 3D 场景制作，学习并应用 Unity 引擎进行场景构建和编辑，参与灯光布置和烘焙灯光贴图。参与制作普通和 PBR 材质的场景模型和贴图，积累了丰富的实践经验。对场景进行优化调整，学习控制场景性能和最终效果。参与二次元风格场景设计，提升了对二次元风格的理解和应用能力。"
      }
      ],
      "projects": [
      {
      "name": "末世题材游戏场景设计",
      "tech": "Unity+3ds MAX+Substance Painter",
      "results": "使用 Unity 引擎构建末世题材游戏场景，通过 3ds MAX 进行模型制作，Substance Painter 绘制 PBR 材质贴图。优化场景性能，控制最终效果，使游戏运行更加流畅。通过灯光布置和烘焙灯光贴图，成功营造出末世的氛围，提升了游戏的沉浸感。"
      },
      {
      "name": "二次元风格场景设计",
      "tech": "Unity+Maya+ZBrush",
      "results": "使用 Unity 引擎构建二次元风格游戏场景，通过 Maya 进行模型制作，ZBrush 进行细节雕刻。优化场景性能，控制最终效果，使游戏运行更加流畅。通过灯光布置和烘焙灯光贴图，成功营造出二次元风格的氛围，提升了游戏的沉浸感。"
      },
      {
      "name": "沙盒游戏场景设计",
      "tech": "Unity+3ds MAX+Substance Painter",
      "results": "使用 Unity 引擎构建沙盒游戏场景，通过 3ds MAX 进行模型制作，Substance Painter 绘制 PBR 材质贴图。优化场景性能，控制最终效果，使游戏运行更加流畅。通过灯光布置和烘焙灯光贴图，成功营造出沙盒游戏的自由氛围，提升了游戏的沉浸感。"
      }
      ],
      "skills": [
      "精通 Unity 引擎，能够独立完成 3D 场景构建和编辑",
      "熟悉 3ds MAX、Maya、ZBrush 等建模软件，具备丰富的模型制作经验",
      "掌握 Substance Painter，能够绘制高质量的 PBR 材质贴图",
      "对光影和渲染有深刻理解，能够准确表现出质感，把控场景的表现",
      "具备良好的沟通能力和团队合作精神，能够高效完成工作任务"
      ]
      },
    isGenerating: false,
    currentStep: 1,
    showScreenshotExampleModal: false,
    scrollAnimation: false,
    generatedTokens: 0,
    progressWidth: '0%',
    progressText: '0%'
  },

  onLoad() {
    // 确保页面加载时重置状态
    this.setData({
      isGenerating: false,
      currentStep: 1,
      generatedTokens: 0
    });
  },

  uploadImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;

        wx.showLoading({ title: '上传中...' });

        // 先上传到云存储
        wx.cloud.uploadFile({
          cloudPath: `ocr_images/${Date.now()}-${Math.random()}.jpg`, // 云存储路径
          filePath: tempFilePath,
          success: (uploadRes) => {
            console.log('上传成功:', uploadRes.fileID);

            // 调用云函数进行 OCR 识别
            wx.cloud.callFunction({
              name: 'ocrJobCloudFunc',
              data: { fileID: uploadRes.fileID },
              success: (res) => {
                if (res.result && res.result.text) {
                  this.setData({
                    jobDescription: res.result.text,
                    currentLength: res.result.text.length
                  });
                }
              },
              fail: (err) => {
                wx.showToast({ title: '识别失败，请重试', icon: 'none' });
                console.log(err);
              },
              complete: (res) => {
                console.log(res.result);
                wx.hideLoading();
              }
            });
          },
          fail: (err) => {
            wx.showToast({ title: '上传失败', icon: 'none' });
            console.error(err);
          }
        });
      }
    });
  },


  onInputChange(e) {
    const value = e.detail.value;
    this.setData({
      jobDescription: value,
      currentLength: value.length
    });
  },

  onFocus() {
    if (this.data.jobDescription === "请输入完整的职位要求...") {
      this.setData({
        jobDescription: "",
        currentLength: 0
      });
    }
  },

  parseJob() {
    if (!this.data.jobDescription.trim()) {
      this.setData({
        isGenerating: true,
        currentStep: 1,
        generatedTokens: 0
      });

      // 模拟加载过程
      setTimeout(() => {
        this.setData({ currentStep: 2 });
        setTimeout(() => {
          this.setData({ currentStep: 3 });
          setTimeout(() => {
            this.setData({ currentStep: 4 });
            // 直接进行页面跳转，不需要先设置 isGenerating: false
            wx.navigateTo({
              url: "/page/resumePreview/preview?data=" + encodeURIComponent(JSON.stringify(this.data.defaultResumeData)),
              success: () => {
                // 在页面跳转成功后再设置 isGenerating: false
                this.setData({ isGenerating: false });
              }
            });
          }, 1000);
        }, 1000);
      }, 1000);

      return;
    }

    // 原有的生成逻辑
    this.setData({
      isGenerating: true,
      currentStep: 1,
      generatedTokens: 0
    });

    wx.cloud.callFunction({
      name: 'generateResumeContent',
      data: {
        jobDescription: this.data.jobDescription
      }
    }).then(res => {
      if (res.result && res.result.taskId) {
        this.startProgressSimulation();
        this.pollTaskResult(res.result.taskId);
      } else {
        this.setData({ 
          isGenerating: false,
          generatedTokens: 0
        });
        wx.showToast({
          title: '生成失败，请重试',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('云函数调用失败:', err);
      this.setData({ 
        isGenerating: false,
        generatedTokens: 0
      });
      wx.showToast({
        title: '服务暂时不可用，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    });
  },

  pollTaskResult(taskId) {
    const db = wx.cloud.database();
    let retryCount = 0;
    const maxRetries = 30;
    
    const checkResult = () => {
      if (retryCount >= maxRetries) {
        this.setData({ isGenerating: false });
        wx.showToast({
          title: '生成超时，请重试',
          icon: 'none'
        });
        return;
      }

      db.collection('ai_tasks').where({
        taskId: taskId
      }).get({
        success: (res) => {
          if (res.data && res.data[0]) {
            const task = res.data[0];
            
            if (task.currentContent) {
              this.setData({
                generatedTokens: task.totalTokens || task.currentContent.length
              });
            }
            
            if (task.status === 'completed') {
              this.setData({ currentStep: 4 });
              // 直接进行页面跳转，不需要先设置 isGenerating: false
              wx.navigateTo({
                url: "/page/resumePreview/preview?data=" + encodeURIComponent(task.result),
                success: () => {
                  // 在页面跳转成功后再设置 isGenerating: false
                  this.setData({ isGenerating: false });
                }
              });
              return;
            } else if (task.status === 'failed') {
              this.setData({ isGenerating: false });
              wx.showToast({
                title: '生成失败，请重试',
                icon: 'none'
              });
              return;
            }
            
            retryCount++;
            setTimeout(checkResult, 2000);
          }
        },
        fail: (err) => {
          this.setData({ isGenerating: false });
          wx.showToast({
            title: '查询失败，请重试',
            icon: 'none'
          });
        }
      });
    };

    checkResult();
  },

  startProgressSimulation() {
    let step = 1;
    const interval = setInterval(() => {
      if (step < 3 && this.data.isGenerating) {
        step++;
        this.setData({ currentStep: step });
      } else {
        clearInterval(interval);
      }
    }, 5000); // 每5秒更新一次进度
  },

  showInputExample() {
    this.setData({ showExampleModal: true });
  },

  closeExampleModal() {
    this.setData({ showExampleModal: false });
  },

  copyExample() {
    const exampleText = `高级前端开发工程师（15-30K·13薪）

岗位职责：
1. 负责公司核心产品的前端开发与优化
...`; // 完整文本

    wx.setClipboardData({
      data: exampleText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  showScreenshotGuide() {
    this.setData({
      showGuideModal: true
    });
  },

  closeGuideModal() {
    this.setData({
      showGuideModal: false
    });
  },

  showScreenshotExample() {
    this.setData({
      showScreenshotExampleModal: true
    }, () => {
      // 延迟开始滚动动画
      setTimeout(() => {
        this.setData({ scrollAnimation: true });
      }, 500);
    });
  },

  closeScreenshotExample() {
    this.setData({
      showScreenshotExampleModal: false,
      scrollAnimation: false
    });
  },

  preventBubbling() {
    return;
  },

  // 更新进度的方法
  updateProgress() {
    const progress = Math.round((this.data.currentStep/4) * 100);
    this.setData({
      progressWidth: progress + '%',
      progressText: progress + '%'
    });
  },

  // 在改变 currentStep 的地方调用 updateProgress
  onStepChange(step) {
    this.setData({ currentStep: step }, () => {
      this.updateProgress();
    });
  }
});
