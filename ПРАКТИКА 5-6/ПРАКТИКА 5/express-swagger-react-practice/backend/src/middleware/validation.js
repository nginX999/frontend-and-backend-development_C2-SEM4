const validateUser = (req, res, next) => {
  const { name, age } = req.body;
  if (req.method === 'POST' && (!name || !age)) {
    return res.status(400).json({ error: 'Name and age are required' });
  }
  next();
};
module.exports = { validateUser };
