Component({
  properties: {
    text: String
  },

  data: {
    isEditing: false,
    tempValue: ''
  },

  methods: {
    startEdit() {
      this.setData({
        isEditing: true,
        tempValue: this.properties.text
      });
    },

    onInput(e) {
      this.setData({ tempValue: e.detail.value });
    },

    saveEdit() {
      this.setData({ isEditing: false });
      this.triggerEvent('edit', { value: this.data.tempValue });
    },

    cancelEdit() {
      this.setData({ isEditing: false });
    },

    onDelete() {
      this.triggerEvent('delete');
    }
  }
});
