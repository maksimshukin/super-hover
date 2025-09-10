// index.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Настраиваем CORS, чтобы разрешить запросы только с вашего сайта
const corsOptions = {
  origin: 'https://dsgnmax.ru'
};
app.use(cors(corsOptions));
app.options('/api/generate', cors(corsOptions));

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

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `Ты — AI-ассистент, эксперт по созданию CSS hover-эффектов... (ваш полный системный промпт)`; // Убедитесь, что ваш полный промпт здесь

    try {
        const geminiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt + "\n\nПользовательский запрос: " + userPrompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
            })
        });

        if (!geminiResponse.ok) {
            const error = await geminiResponse.json();
            throw new Error(error.error.message || 'Ошибка ответа от Gemini API');
        }

        const data = await geminiResponse.json();
        res.json(data);

    } catch (error) {
        console.error('Ошибка прокси-сервера:', error);
        res.status(500).json({ error: 'Не удалось обработать запрос.' });
    }
});

// Экспортируем приложение для Vercel
module.exports = app;