const { nanoid } = require('nanoid');
let users = [
  { id: nanoid(6), name: 'Петр', age: 16 },
  { id: nanoid(6), name: 'Иван', age: 18 },
  { id: nanoid(6), name: 'Дарья', age: 20 },
];

const getAllUsers = (req, res) => res.json(users);

const getUserById = (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  user ? res.json(user) : res.status(404).json({ error: 'User not found' });
};

const createUser = (req, res) => {
  const newUser = {
    id: nanoid(6),
    name: req.body.name.trim(),
    age: Number(req.body.age),
  };
  users.push(newUser);
  res.status(201).json(newUser);
};

const updateUser = (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (req.body.name) user.name = req.body.name.trim();
  if (req.body.age) user.age = Number(req.body.age);
  res.json(user);
};

const deleteUser = (req, res) => {
  users = users.filter(u => u.id !== req.params.id);
  res.status(204).send();
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
