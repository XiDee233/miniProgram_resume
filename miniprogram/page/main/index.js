Page({

  data: {
    examples: [],
    exampleTexts: [
      "该不该去上课？",
      "明天结婚好吗？",
      "要换工作吗？",
      "买房还是租房？",
      "该不该表白？",
      "创业时机到了吗？",
      "考研还是工作？",
      "要不要跳槽？",
      "该投资股票吗？",
      "现在适合要孩子吗？"
    ]
  },

  // 记录最近使用的位置
  lastPositions: [],
  lastYPositions: [], // 新增：记录Y轴位置历史
  lastTexts: [],

  onReady() {
    // 立即显示第一个
    this.generateNewExample();
  },

  generateNewExample() {
    const text = this.getRandomText();
    const position = this.getRandomPosition(text.length);
    
    const newExample = {
      text: text,
      left: position.left,
      top: position.top,
      size: Math.floor(Math.random() * 4 + 28),
      id: Date.now()
    };

    this.setData({
      examples: [...this.data.examples, newExample]
    });

    setTimeout(() => {
      const examples = this.data.examples.filter(item => item.id !== newExample.id);
      this.setData({ examples });
    }, 4000);

    setTimeout(() => {
      this.generateNewExample();
    }, 2000);
  },

  getRandomText() {
    const texts = this.data.exampleTexts;
    
    // 过滤掉最近使用过的文字
    const availableTexts = texts.filter(text => 
      !this.lastTexts.includes(text)
    );
    
    // 如果所有文字都用过了，重置历史
    const text = availableTexts.length > 0 ? 
      availableTexts[Math.floor(Math.random() * availableTexts.length)] : 
      texts[Math.floor(Math.random() * texts.length)];
    
    // 记录文字历史
    this.lastTexts.push(text);
    if (this.lastTexts.length > texts.length * 0.5) { // 保持一半的历史
      this.lastTexts.shift();
    }
    
    return text;
  },

  getRandomPosition(textLength) {
    const screenWidth = wx.getSystemInfoSync().windowWidth;
    const charWidth = (32 * screenWidth) / 750;
    const estimatedWidth = textLength * charWidth;
    const maxLeftPercent = ((screenWidth - estimatedWidth) / screenWidth) * 100;
    
    // X轴位置计算
    const areas = [
      { min: 5, max: Math.min(20, maxLeftPercent * 0.25) },
      { min: 25, max: Math.min(40, maxLeftPercent * 0.5) },
      { min: 45, max: Math.min(60, maxLeftPercent * 0.75) },
      { min: 65, max: Math.min(80, maxLeftPercent * 0.9) }
    ].filter(area => area.max > area.min);
    
    const availableAreas = areas.filter(area => {
      return !this.lastPositions.some(pos => 
        pos >= area.min - 10 && pos <= area.max + 10
      );
    });
    
    const selectedArea = availableAreas.length > 0 ? 
      availableAreas[Math.floor(Math.random() * availableAreas.length)] : 
      areas[0];
    
    const left = Math.min(
      selectedArea.min + Math.random() * (selectedArea.max - selectedArea.min),
      maxLeftPercent * 0.95
    );
    
    // Y轴位置计算
    const yAreas = [
      { min: 15, max: 20 },  // 上部
      { min: 21, max: 27 },  // 中上部
      { min: 28, max: 35 }   // 中下部
    ];
    
    // 过滤掉最近使用过的Y轴区域
    const availableYAreas = yAreas.filter(area => {
      return !this.lastYPositions.some(pos => 
        pos >= area.min - 5 && pos <= area.max + 5
      );
    });
    
    const selectedYArea = availableYAreas.length > 0 ?
      availableYAreas[Math.floor(Math.random() * availableYAreas.length)] :
      yAreas[Math.floor(Math.random() * yAreas.length)];
    
    const top = selectedYArea.min + Math.random() * (selectedYArea.max - selectedYArea.min);
    
    // 记录位置历史
    this.lastPositions.push(left);
    if (this.lastPositions.length > 3) {
      this.lastPositions.shift();
    }
    
    this.lastYPositions.push(top);
    if (this.lastYPositions.length > 2) { // Y轴保持较短的历史
      this.lastYPositions.shift();
    }
    
    return { left, top };
  },

  onUnload() {
    // 清理所有定时器
    this.clearAllTimers();
  },

  clearAllTimers() {
    // 获取所有定时器ID并清理
    const highestId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestId; i++) {
      clearTimeout(i);
    }
  },

  handleTap() {
    wx.showToast({
      title: `输入内容：${this.data.inputValue}`,
      icon: 'none'
    });
  },
  
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  }
})