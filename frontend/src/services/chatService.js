import api from './api';

const chatService = {
  async getConversations() {
    return (await api.get('/chat/conversations')).data;
  },
  async getMessages(conversationId) {
    return (await api.get(`/chat/conversations/${conversationId}/messages`)).data;
  },
  async markRead(conversationId, lastReadMessageId) {
    return api.post(`/chat/conversations/${conversationId}/read`, {
      last_read_message_id: lastReadMessageId,
    });
  },
  async sendMessage(conversationId, content) {
    return (await api.post(`/chat/conversations/${conversationId}/messages`, { content })).data;
  },
};

export default chatService;
