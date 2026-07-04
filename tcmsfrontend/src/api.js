export const APP_URL = (process.env.REACT_APP_APP_URL || 'http://localhost:8000').replace(/\/$/, '');
export const API_URL = `${APP_URL}/api`;

export const apiUrl = (path = '') => {
  if (!path) {
    return APP_URL;
  }

  if (/^https?:\/\/localhost:8000/i.test(path)) {
    return path.replace(/^https?:\/\/localhost:8000/i, APP_URL);
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
