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
    // --- КОНЕЦ БЛОКА CORS ---

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Получаем не только промпт, но и контекст DOM
        const { prompt: userPrompt, domContext } = req.body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'API ключ не сконфигурирован на сервере.' });
        }
        if (!userPrompt) {
            return res.status(400).json({ error: 'Текст запроса (prompt) отсутствует.' });
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

        // --- НОВЫЙ СУПЕР-ПРОМПТ ---
        const systemPrompt = `Ты — AI-ассистент, эксперт по созданию сложных CSS hover-эффектов. Твоя задача — сгенерировать JSON-объект на основе запроса пользователя и предоставленного HTML-контекста.
        ТЫ ОБЯЗАН ОТВЕЧАТЬ ТОЛЬКО JSON-ОБЪЕКТОМ В ФОРМАТЕ MARKDOWN И БОЛЬШЕ НИЧЕМ.

        СТРУКТУРА ВХОДНЫХ ДАННЫХ:
        1.  Запрос пользователя (например: "добавь тень, лёгкий подъём и поворот на 10 градусов по оси X карточке, внутри карточки тексту красный цвет, а родителю перспективу 400").
        2.  HTML-контекст (domContext), который описывает структуру элементов.

        ТВОЯ ЗАДАЧА:
        1.  Внимательно проанализируй запрос и сопоставь слова ("карточка", "текст", "родитель") с селекторами из domContext.
        2.  Сгенерируй JSON, который применяет эффекты к правильным селекторам.
        3.  Если свойство не упоминается, НЕ ДОБАВЛЯЙ его в JSON. Используй только те свойства, о которых просит пользователь.
        4.  Для свойства 'transform' всегда включай 'transformEnabled: true'.

        СТРУКТУРА JSON-ОТВЕТА:
        {
          "parent": { /* Стили для "Выбранного элемента" */ },
          "children": {
            ".child-selector-1": { /* Стили для первого дочернего элемента */ },
            ".child-selector-2": { /* Стили для второго дочернего элемента */ }
          }
        }
        
        ВАЖНО: Эффекты для "Родителя" (например, perspective) нужно применять к "Выбранному элементу" (parent), так как это частый паттерн в CSS-анимации (родитель контейнера получает перспективу).

        ПРИМЕР РАБОТЫ:
        - Запрос: "поверни карточку на 10 градусов по Y, а заголовку сделай синий цвет"
        - domContext:
          - Родитель: div.t-col
          - Выбранный элемент (карточка): a.t-card
          - Дочерние элементы:
            - div.t-card__title (заголовок)
        - Твой правильный ответ:
        \`\`\`json
        {
          "parent": {
            "transformEnabled": true,
            "rotateY": 10,
            "animationEnabled": true,
            "duration": 300,
            "easing": "ease-out"
          },
          "children": {
            "div.t-card__title": {
              "textEnabled": true,
              "color": "#0000FF",
              "animationEnabled": true,
              "duration": 300
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