import axios from 'axios';
import { showAlert } from './alerts.js';

// type is either 'data' or 'password'
const updateSettings = async (data, type) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: `/api/v1/users/${type === 'password' ? 'updateMyPassword' : 'updateMe'}`,
      data
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    }
  } catch (error) {
    showAlert('error', error.response.data.message);
  }
}

export { updateSettings };