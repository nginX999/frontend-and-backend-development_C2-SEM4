const express = require('express');
const app = express();
const port = 3000;

let goods = [
    { id: 1, name: 'Телефон', price: 10000 },
    { id: 2, name: 'Ноутбук', price: 50000 },
    { id: 3, name: "Наушники", price: 2000 }
];

app.use(express.json())

app.get('/', (req, res) => {
    res.send('API товаров работает');
})

app.get('/goods', (req, res) => {
    res.json(goods);
})

app.get('/goods/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const good = goods.find(g => g.id === id);

    if (!good) {
        return res.status(404).json({ message: "Товар не найден"})
    }

    res.json(good);
})

app.post('/goods', (req, res) => {
    const { name, price } = req.body;

    if (!name || !price) {
        return res.status(400).json({ message: "Укажите название и цену"})
    }

    const newGood = {
        id: Date.now(),
        name,
        price
    };

    goods.push(newGood);
    res.status(201).json(newGood);
})

app.patch('/goods/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const good = goods.find(g => g.id === id);
    
    if (!good) {
        return res.status(404).json({ message: 'Товар не найден' });
    }
    
    const { name, price } = req.body;
    
    if (name !== undefined) good.name = name;
    if (price !== undefined) good.price = price;
    
    res.json(good);
});

app.delete('/goods/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = goods.findIndex(g => g.id === id);
    
    if (index === -1) {
        return res.status(404).json({ message: 'Товар не найден' });
    }
    
    goods.splice(index, 1);
    res.json({ message: 'Товар удален' });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http:localhost:${port}`);
});
