Component({
  properties: {
    items: {
      type: Array,
      value: []
    },
    placeholder: {
      type: String,
      value: ''
    }
  },

  data: {
    localItems: []
  },

  observers: {
    'items': function(newItems) {
      if (!newItems) {
        this.setData({
          localItems: []
        });
        return;
      }
      
      const items = [];
      for (let i = 0; i < newItems.length; i++) {
        items.push(newItems[i]);
      }
      
      this.setData({
        localItems: items
      });
    }
  },

  methods: {
    onInput: function(e) {
      const { index } = e.currentTarget.dataset;
      const { value } = e.detail;
      
      const items = this.data.localItems;
      items[index] = value;
      
      this.setData({
        localItems: items
      });
      
      this.triggerEvent('change', { items: items });
    },

    addItem: function() {
      const items = this.data.localItems;
      items.push('');
      
      this.setData({
        localItems: items
      });
      
      this.triggerEvent('change', { items: items });
    },

    deleteItem: function(e) {
      const { index } = e.currentTarget.dataset;
      const items = this.data.localItems;
      items.splice(index, 1);
      
      this.setData({
        localItems: items
      });
      
      this.triggerEvent('change', { items: items });
    }
  }
});
