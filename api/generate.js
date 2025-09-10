// api/generate.js
const fetch = require('node-fetch');

// Загружаем переменные окружения
require('dotenv').config();

export default async function handler(req, res) {
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    
    // Настраиваем CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://dsgnmax.ru');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Обрабатываем preflight запросы
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS request');
        res.status(200).end();
        return;
    }

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

    // Системный промпт для генерации CSS hover-эффектов
    const systemPrompt = `Ты — AI-ассистент, эксперт по созданию CSS hover-эффектов. 
        Твоя задача — сгенерировать JSON-объект, описывающий эффект, на основе запроса пользователя.
        ТЫ ОБЯЗАН ОТВЕЧАТЬ ТОЛЬКО JSON-ОБЪЕКТОМ В ФОРМАТЕ MARKDOWN И БОЛЬШЕ НИЧЕМ.

        Структура JSON должна быть следующей:
        {
          "parent": { /* Стили для основного элемента */ },
          "children": { ".css-selector": { /* Стили для дочернего элемента */ } }
        }

        Каждый объект стилей может содержать следующие свойства (если свойство не нужно, не включай его):
        - transformEnabled: true
        - translateX/translateY: число (обычно от -50 до 50)
        - rotateX/rotateY/rotateZ: число (в градусах, обычно от -90 до 90)
        - scaleX/scaleY: число (обычно от 0.5 до 1.5)
        - skewX/skewY: число (в градусах, обычно от -45 до 45)
        - styleEnabled: true
        - opacity: число (от 0 до 1)
        - backgroundColor: строка (hex или rgba)
        - boxShadowEnabled: true
        - boxShadowX/boxShadowY/boxShadowBlur/boxShadowSpread: число
        - boxShadowColor: строка (rgba)
        - boxShadowInset: true/false
        - textEnabled: true
        - color: строка (hex или rgba)
        - animationEnabled: true
        - duration: число (в миллисекундах, обычно от 150 до 600)
        - easing: 'ease', 'ease-in-out', 'ease-in', 'ease-out', 'linear'

        Пример: Пользователь просит "плавный подъем с тенью".
        Твой ответ:
        \`\`\`json
        {
          "parent": {
            "transformEnabled": true,
            "translateY": -10,
            "boxShadowEnabled": true,
            "boxShadowY": 20,
            "boxShadowBlur": 30,
            "boxShadowColor": "rgba(0,0,0,0.2)",
            "animationEnabled": true,
            "duration": 300,
            "easing": "ease-out"
          },
          "children": {}
        }
        \`\`\`
    `;

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
        // Отправляем ответ от Gemini обратно в браузер
        res.status(200).json(data);

    } catch (error) {
        console.error('Ошибка прокси-сервера:', error);
        res.status(500).json({ error: 'Не удалось обработать запрос.' });
    }
}
