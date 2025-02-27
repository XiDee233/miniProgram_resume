Component({
  properties: {
    value: String,
    label: String,
    placeholder: {
      type: String,
      value: '请输入'
    }
  },
  
  methods: {
    onInput(e) {
      const value = e.detail.value;
      this.triggerEvent('change', { value });
    }
  }
});