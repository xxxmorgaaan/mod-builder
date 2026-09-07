// server.js
// Простой статический сервер на Express. Вся логика конструктора мода
// работает в браузере (public/app.js), сервер только раздаёт файлы.
// Так проект можно без изменений задеплоить на Render / Railway / Fly.io /
// Glitch / обычный VPS — везде, где есть Node.js.

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Отдаём index.html на любой неизвестный путь (на случай,
// если потом добавите вкладки с собственными URL).
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Alem Mod Builder запущен: http://localhost:${PORT}`);
});
