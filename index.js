// index.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

// Загружаем переменные окружения (наш ключ)
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Разрешаем запросы с любого источника
const corsOptions = {
    origin: 'https://dsgnmax.ru' // Разрешаем запросы только с этого домена
  };
// Позволяем серверу принимать JSON
app.use(express.json());

// Создаем единственный endpoint /api/generate
app.post('/api/generate', async (req, res) => {
    const userPrompt = req.body.prompt;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API ключ не найден на сервере.' });
    }
    if (!userPrompt) {
        return res.status(400).json({ error: 'Текст запроса (prompt) отсутствует.' });
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${AIzaSyDBd8nOUW-0Bup7B9JipIr6zjUIt1fnUnE}`;

    // Здесь тот самый системный промпт, который мы отправляем в Gemini
    const systemPrompt = `Ты — AI-ассистент... (ваш полный системный промпт)`; // Вставьте ваш промпт отсюда

    try {
        const geminiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt + "\n\nПользовательский запрос: " + userPrompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
            })
        });

        if (!geminiResponse.ok) {
            const error = await geminiResponse.json();
            throw new Error(error.error.message || 'Ошибка ответа от Gemini API');
        }

        const data = await geminiResponse.json();
        // Отправляем ответ от Gemini обратно в браузер
        res.json(data);

    } catch (error) {
        console.error('Ошибка прокси-сервера:', error);
        res.status(500).json({ error: 'Не удалось обработать запрос.' });
    }
});

app.listen(port, () => {
    console.log(`Прокси-сервер запущен на порту ${port}`);
});