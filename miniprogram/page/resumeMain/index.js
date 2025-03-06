Page({
  data: {
    imageUrl: "",
    jobDescription: "",
    currentLength: 0,
    showExampleModal: false,
    showGuideModal: false,
    uploadTip: "",
    defaultResumeData: {
      "name": "小明",
      "age": 30,
      "gender": "男",
      "phone": "178××××5678",
      "email": "zhangxx@tutanota.com",
      "education": {
        "school": "××大学",
        "major": "xx | 本科",
        "duration": "xxx",
        "courses": ["xx", "xx", "xx", "xx", "xx"]
      },
      "honors": ["xx", "xx", "xx", "xx"],
      "work_experience": [
        {
          "years": "xx",
          "company": "×× 公司",
          "position": "xx",
          "details": "xx"
        },
        {
          "years": "xx",
          "company": "×× 公司",
          "position": "xx",
          "details": "xx"
        },
        {
          "years": "xx",
          "company": "×× 企业",
          "position": "xx",
          "details": "xx"
        }
      ],
      "projects": [
        {
          "name": "xx",
          "tech": "xx",
          "results": "xx"
        },
        {
          "name": "xx",
          "tech": "xx",
          "results": "xx"
        },
        {
          "name": "xx",
          "tech": "xx",
          "results": "xx"
        },
        {
          "name": "xx",
          "tech": "xx",
          "results": "xx"
        }
      ],
      "skills": [
        "xx",
        "xx",
        "xx",
        "xx",
        "xx"
      ]
    },
    // isPrivacyPolicyAccepted: false,
    // showPrivacy: false
  },

  onLoad() {
    // 确保页面加载时重置状态
    this.setData({
      isGenerating: false,
      currentStep: 1,
      generatedTokens: 0
    });

    this.loadUploadTip();

  },

  loadUploadTip() {
    const db = wx.cloud.database();
    db.collection('tips').doc('ef34384667c6cbe3005a4573243a639e') // 替换为你的文档ID
      .get()
      .then(res => {
        this.setData({
          uploadTip: res.data.text // 假设你的文档中有一个字段叫 text
        });
      })
      .catch(err => {
        console.error('获取提示文本失败:', err);
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
    wx.showLoading({
      title: '加载中...',
      mask: true // 遮罩层
    });
    this.setData({
      isKeyEmpty: false // 初始化为 false
    });

    const db = wx.cloud.database();
    const keyDocId = "1c5ac29f67c3bb4600311a493a34ede8"; // 文档ID

    db.collection('keys').doc(keyDocId).get().then(res => {
      const theKey = res.data ? res.data.theKey : null;

      if (theKey === "") {
        this.setData({
          isKeyEmpty: true // 设置为 true
        });

      }

      // 继续执行原有的逻辑
      if (!this.data.jobDescription.trim() || this.data.isKeyEmpty) {
        this.setData({
          isGenerating: true,
          currentStep: 1,
          generatedTokens: 0
        });

        // // 模拟加载过程
        // setTimeout(() => {
        //   this.setData({ currentStep: 2 });
        //   setTimeout(() => {
        //     this.setData({ currentStep: 3 });
        //     setTimeout(() => {
        //       this.setData({ currentStep: 4 });
        //       // 直接进行页面跳转，不需要先设置 isGenerating: false
        //       wx.navigateTo({
        //         url: "/page/resumePreview/preview?data=" + encodeURIComponent(JSON.stringify(this.data.defaultResumeData)),
        //         success: () => {
        //           // 在页面跳转成功后再设置 isGenerating: false
        //           this.setData({ isGenerating: false });
        //           wx.hideLoading(); // 隐藏加载提示
        //         }
        //       });
        //     }, 200);
        //   }, 200);
        // }, 200);
        wx.navigateTo({
          url: "/page/resumePreview/preview?data=" + encodeURIComponent(JSON.stringify(this.data.defaultResumeData)),
          success: () => {
            // 在页面跳转成功后再设置 isGenerating: false
            this.setData({ isGenerating: false });
            wx.hideLoading(); // 隐藏加载提示
          }
        });
        return;
      }
      wx.hideLoading(); // 隐藏加载提示

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
          wx.hideLoading(); // 隐藏加载提示
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
        wx.hideLoading(); // 隐藏加载提示
      });
    }).catch(err => {
      console.error('获取 theKey 失败:', err);
      wx.showToast({
        title: '无法检查密钥，请稍后重试',
        icon: 'none'
      });
      wx.hideLoading(); // 隐藏加载提示
    });
  },

  pollTaskResult(taskId) {
    const db = wx.cloud.database();
    let attempts = 0;
    const maxAttempts = 120; // 最大尝试次数

    const checkInterval = setInterval(async () => {
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        this.setData({ isGenerating: false });
        wx.showToast({
          title: '生成超时，请重试',
          icon: 'none'
        });
        this.deleteResumeContentTask(taskId);
        return;
      }
      attempts++;
      console.log('轮询尝试次数: ' + attempts);

      try {
        const res = await db.collection('gen_tasks').doc(taskId).get();
        if (res.data) {
          const task = res.data;

          if (task.currentContent) {
            this.setData({
              generatedTokens: task.totalTokens || task.currentContent.length
            });
          }

          if (task.status === 'completed' || task.status === 'failed') {
            clearInterval(checkInterval); // 停止轮询
            this.setData({ currentStep: 4 });
            wx.navigateTo({
              url: "/page/resumePreview/preview?data=" + encodeURIComponent(task.currentContent),
              success: () => {
                this.setData({ isGenerating: false });
                wx.hideLoading()
              }
            });
            return; // 成功或失败后停止轮询
          }
        }
      } catch (err) {
        console.error('查询任务状态失败:', err);
        clearInterval(checkInterval);
        this.setData({ isGenerating: false });
        wx.showToast({
          title: '查询失败，请重试',
          icon: 'none'
        });
      }
    }, 1000); // 每秒检查一次
    this.checkInterval = checkInterval; // 保存 interval，以便在其他函数中清除
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

  closeGuideModal() {
    this.setData({
      showGuideModal: false
    });
  },

  showScreenshotExample() {
    this.setData({
      showScreenshotExampleModal: true
    }, () => {
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

  updateProgress() {
    const progress = Math.round((this.data.currentStep / 4) * 100);
    this.setData({
      progressWidth: progress + '%',
      progressText: progress + '%'
    });
  },

  onStepChange(step) {
    this.setData({ currentStep: step }, () => {
      this.updateProgress();
    });
  },

  // 添加 onShareTimeline 方法以支持分享到朋友圈
  onShareTimeline() {
    return {
      title: '一键生成完美简历', // 自定义标题
    };
  },

  onShareAppMessage() {
    const promise = new Promise(resolve => {
      setTimeout(() => {
        resolve({
          title: '一键生成完美简历'
        });
      }, 2000);
    });
    return {
      title: '一键生成完美简历',
      promise 
    };
  },
})
