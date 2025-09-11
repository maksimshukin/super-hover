// Файл: /api/generate.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export default async function handler(req, res) {
    // --- БЛОК CORS (оставляем как есть) ---
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt: userPrompt, domContext } = req.body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'API ключ не сконфигурирован на сервере.' });
        }
        if (!userPrompt) {
            return res.status(400).json({ error: 'Текст запроса (prompt) отсутствует.' });
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

        // --- НОВЫЙ, УЛУЧШЕННЫЙ СИСТЕМНЫЙ ПРОМПТ ---
        const systemPrompt = `Ты — AI-ассистент, эксперт по CSS hover-эффектам. Твоя задача — сгенерировать JSON-объект на основе запроса и HTML-контекста.
        ТЫ ОБЯЗАН ОТВЕЧАТЬ ТОЛЬКО JSON-ОБЪЕКТОМ В ФОРМАТЕ MARKDOWN И БОЛЬШЕ НИЧЕМ.

        ПРАВИЛА ГЕНЕРАЦИИ:
        1.  Анализируй запрос и HTML-контекст (domContext), чтобы применить стили к правильным селекторам.
        2.  Для дочерних элементов в JSON используй ТОЛЬКО короткие, относительные селекторы, предоставленные в контексте.
        3.  Если пользователь просит применить эффект к "родителю" (например, перспективу), применяй его к "Выбранному элементу" (ключ "parent" в JSON).
        4.  Включай в JSON ТОЛЬКО те свойства, о которых просит пользователь.
        5.  Для любых трансформаций (translate, scale, rotate) ВСЕГДА добавляй "transformEnabled": true.
        6.  Для любых текстовых эффектов ВСЕГДА добавляй "textEnabled": true.
        7.  Всегда добавляй "animationEnabled": true и "duration": 300 для плавности, если не указано иное.
        8.  НЕ ИСПОЛЬЗУЙ 'undefined', 'null' или пустые строки в значениях. Если значение неизвестно, просто не включай это свойство в JSON.

        СТРУКТУРА JSON-ОТВЕТА:
        {
          "parent": { /* Стили для "Выбранного элемента" */ },
          "children": {
            ".child-selector": { /* Стили для дочернего элемента */ }
          }
        }

        ПРИМЕР РАБОТЫ:
        - Запрос: "добавь тень, лёгкий подъём и поворот на 10 градусов по оси X карточке, а заголовку красный цвет."
        - domContext:
          - Родитель: .t-list__item
          - Выбранный элемент (карточка): .t-card
          - Дочерние элементы:
            - .t-card__title (заголовок)
            - .t-card__descr (описание)
        - Твой ПРАВИЛЬНЫЙ ответ:
        \`\`\`json
        {
          "parent": {
            "transformEnabled": true,
            "translateY": -10,
            "rotateX": 10,
            "boxShadowEnabled": true,
            "boxShadowY": 15,
            "boxShadowBlur": 25,
            "boxShadowColor": "rgba(0,0,0,0.15)",
            "animationEnabled": true,
            "duration": 300
          },
          "children": {
            ".t-card__title": {
              "textEnabled": true,
              "color": "red"
            }
          }
        }
        \`\`\`
        `;
        
        const fullPrompt = `${systemPrompt}\n\nHTML-контекст:\n${domContext}\n\nЗапрос пользователя:\n${userPrompt}`;

        const geminiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
            })
        });

        if (!geminiResponse.ok) {
            const error = await geminiResponse.json();
            throw new Error(error.error.message || 'Ошибка ответа от Gemini API');
        }

        const data = await geminiResponse.json();
        res.status(200).json(data);

    } catch (error) {
        console.error('Ошибка выполнения функции:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.', details: error.message });
    }
}