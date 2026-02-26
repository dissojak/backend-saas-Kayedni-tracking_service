const success = (res, data, status = 200) => {
  res.status(status).json({ success: true, data });
};

const error = (res, message, status = 400) => {
  res.status(status).json({ success: false, message });
};

module.exports = { success, error };
