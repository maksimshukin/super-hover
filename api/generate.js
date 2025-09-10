// Файл: /api/generate.js
const fetch = require('node-fetch');

// Загружаем переменные окружения
require('dotenv').config();

export default async function handler(req, res) {
    // --- НАЧАЛО БЛОКА CORS ---
    // Эти заголовки позволяют ЛЮБОМУ сайту делать запросы к вашему API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Браузер сначала отправляет запрос OPTIONS для проверки разрешений.
    // Мы должны ответить на него статусом 200 (OK), чтобы браузер разрешил основной запрос.
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    // --- КОНЕЦ БЛОКА CORS ---

    // Проверяем, что это POST запрос
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userPrompt = req.body.prompt;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API ключ не найден на сервере.' });
    }
    if (!userPrompt) {
        return res.status(400).json({ error: 'Текст запроса (prompt) отсутствует.' });
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    // Системный промпт (остается без изменений)
    const systemPrompt = `Ты — AI-ассистент, эксперт по созданию CSS hover-эффектов... (ваш промпт здесь)`;

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
        res.status(200).json(data);

    } catch (error) {
        console.error('Ошибка прокси-сервера:', error);
        res.status(500).json({ error: 'Не удалось обработать запрос.' });
    }
}