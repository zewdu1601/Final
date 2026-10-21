import api from './api';

const userService = {
  updateProfile: async (profile) => {
    const response = await api.patch('/auth/me', profile);
    return response.data;
  },
  changePassword: async (passwords) => {
    const response = await api.post('/auth/password', {
      current_password: passwords.currentPassword,
      new_password: passwords.newPassword,
      confirm_password: passwords.confirmPassword,
    });
    return response.data;
  },
};

export default userService;