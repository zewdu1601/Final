import api from './api';

export const getStoredUser = () => {
  try {
    const token = localStorage.getItem('aiStoreToken');
    const user = localStorage.getItem('aiStoreUser');
    return token && user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Unable to restore the signed-in user', error);
    return null;
  }
};

export const register = async ({ fullName, username, email, password, contactPhone, address }) => {
  const response = await api.post('/auth/register', {
    full_name: fullName,
    username,
    email,
    password,
    contact_phone: contactPhone,
    address,
  });
  return response.data;
};

export const login = async (identifier, password) => {
  const loginIdentifier = identifier.trim();
  const credentials = loginIdentifier.includes('@')
    ? { email: loginIdentifier, password }
    : { username: loginIdentifier, password };
  const response = await api.post('/auth/login', credentials);
  const { access_token: token, user } = response.data;

  try {
    localStorage.setItem('aiStoreToken', token);
    localStorage.setItem('aiStoreUser', JSON.stringify(user));
  } catch (error) {
    throw new Error('Unable to save your login on this device. Please check browser storage settings.', { cause: error });
  }

  return user;
};

export const logout = () => {
  localStorage.removeItem('aiStoreToken');
  localStorage.removeItem('aiStoreUser');
};

export const updateStoredUser = (user) => {
  try {
    localStorage.setItem('aiStoreUser', JSON.stringify(user));
    return user;
  } catch (error) {
    throw new Error('Your profile was updated, but could not be saved on this device.', { cause: error });
  }
};

export const invalidateSession = async () => {
  await api.post('/auth/logout');
  logout();
};