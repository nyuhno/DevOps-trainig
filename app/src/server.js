/**
 * Простое веб-приложение на Express.js с использованием Redis для подсчёта посещений
 * 
 * Архитектура:
 * - Express обрабатывает HTTP-запросы
 * - Redis хранит счётчик посещений
 * - Приложение предназначено для запуска в Docker-контейнере
 */

// Подключаем модуль Express для создания веб-сервера
const express = require('express');
// Подключаем модуль Redis для работы с базой данных in-memory
const redis = require('redis');

// Создаём экземпляр Express-приложения
const app = express();
// Определяем порт, на котором будет слушать сервер
// PORT берётся из переменных окружения, если не задан - используется 3000
const PORT = process.env.PORT || 3000;

/**
 * Настройка подключения к Redis
 * 
 * URL: redis://redis:6379
 * - 'redis' - имя хоста (в Docker Compose это имя сервиса)
 * - 6379 - стандартный порт Redis
 * 
 * Важно: при запуске вне Docker нужно заменить 'redis' на 'localhost'
 */
const redisClient = redis.createClient({
    url: 'redis://redis:6379'
});

/**
 * Обработчики событий Redis клиента
 * Нужны для мониторинга состояния подключения
 */
// Обработка ошибок подключения
redisClient.on('error', (err) => console.log('Redis Client Error', err));
// Обработка успешного подключения
redisClient.on('connect', () => console.log('Connected to Redis'));

/**
 * Асинхронная функция для установки соединения с Redis
 * 
 * Используем IIFE (Immediately Invoked Function Expression) с async/await,
 * потому что redisClient.connect() возвращает Promise
 * 
 * Современные версии Redis-клиента требуют явного вызова connect()
 */
(async () => {
    await redisClient.connect();
})();

/**
 * Основной эндпоинт - главная страница
 * 
 * GET / - возвращает HTML-страницу с счётчиком посещений
 * 
 * Алгоритм работы:
 * 1. Инкрементируем значение ключа 'visits' в Redis
 * 2. Полученное значение подставляем в HTML-шаблон
 * 3. Отправляем страницу клиенту
 */
app.get('/', async (req, res) => {
    try {
        // INCR - атомарная операция увеличения счётчика в Redis
        // Если ключа 'visits' не существует, Redis создаст его со значением 0 и затем увеличит до 1
        const visits = await redisClient.incr('visits');
        
        // Отправляем HTML-ответ клиенту
        // Используем шаблонные строки (template literals) для вставки динамических значений
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MyApp</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
                    h1 { color: #333; }
                    .counter { font-size: 48px; color: #0066cc; margin: 20px; }
                    .info { color: #666; margin-top: 30px; }
                </style>
            </head>
            <body>
                <h1>Hello World from Docker!</h1>
                <p>This page has been visited</p>
                <div class="counter">${visits} times</div>
                <p class="info">Served by: ${req.socket.localAddress} | Redis: connected</p>
            </body>
            </html>
        `);
    } catch (error) {
        // Если произошла ошибка (например, Redis недоступен), отправляем сообщение об ошибке
        res.send(`Error: ${error.message}`);
    }
});

/**
 * Эндпоинт для проверки работоспособности (healthcheck)
 * 
 * GET /health - возвращает JSON с состоянием приложения
 * 
 * Используется для:
 * - Docker HEALTHCHECK инструкции
 * - Kubernetes liveness/readiness probes
 * - Мониторинга (например, Prometheus может проверять этот эндпоинт)
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',           // Статус приложения
        timestamp: new Date().toISOString()  // ISO 8601 формат времени
    });
});

/**
 * Запуск HTTP-сервера
 * 
 * app.listen() начинает принимать входящие соединения на указанном порту
 * Колбэк вызывается после успешного старта сервера
 */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});