const bcrypt = require('bcrypt');

async function generateHashes() {
  console.log('Генерация хешей паролей...\n');
  
  const adminHash = await bcrypt.hash('admin123', 10);
  const sellerHash = await bcrypt.hash('seller123', 10);
  const userHash = await bcrypt.hash('user123', 10);
  
  console.log('Скопируйте эти хеши в файл users.json:\n');
  console.log('Администратор (admin@shop.com / admin123):');
  console.log(adminHash);
  console.log('\nПродавец (seller@shop.com / seller123):');
  console.log(sellerHash);
  console.log('\nПользователь (user@shop.com / user123):');
  console.log(userHash);
}

generateHashes();