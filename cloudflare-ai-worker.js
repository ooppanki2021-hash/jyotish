/* ============================================================
   Cloudflare Worker — бесплатный ИИ-чат (Workers AI)
   БЕЗ ключей, БЕЗ оплаты, БЕЗ сторонних сервисов.
   Нужен только бесплатный аккаунт Cloudflare.

   Как это работает:
   Cloudflare даёт бесплатный лимит Workers AI (10 000 токенов/день),
   этого с запасом хватает для личного чата с астрологом.

   КАК РАЗВЕРНУТЬ (~5 минут, бесплатно):
   1. Зарегистрируйтесь на dash.cloudflare.com (email, бесплатно).
   2. Workers & Pages → Create → Create Worker.
   3. Дайте имя (например «astro-ai»), нажмите Deploy.
   4. Нажмите «Edit code», удалите шаблон и вставьте ЭТОТ файл целиком.
   5. Добавьте привязку ИИ: в редакторе слева/сверху найдите
      «Settings» (или внизу «Add binding»):
        Type = "AI" (Workers AI), имя переменной = "AI".
      (В новых версиях Cloudflare достаточно включить Workers AI —
       переменная env.AI появляется автоматически.)
   6. Deploy. Worker станет доступен по адресу:
        https://astro-ai.ВАШ-ЛОГИН.workers.dev
   7. На сайте: провайдер «Cloudflare (бесплатно)», в поле Base URL
      вставьте этот адрес. Поле ключа оставьте пустым.

   Модель по умолчанию: @cf/meta/llama-3.1-8b-instruct (хороша, быстрая).
   Можно поменять в поле «Модель» на:
     @cf/meta/llama-3.2-3b-instruct  (быстрее)
     @cf/deepseek-ai/deepseek-r1-distill-qwen-32b  (умнее, но медленнее)
   ============================================================ */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Только POST' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();
      const messages = body.messages || [];
      const model = body.model || '@cf/meta/llama-3.1-8b-instruct';

      if (!env.AI) {
        return new Response(JSON.stringify({
          error: 'Не подключён Workers AI. В настройках Worker добавьте привязку (binding) типа AI.'
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const result = await env.AI.run(model, {
        messages: messages,
        max_tokens: 1500
      });

      // Workers AI возвращает { response: "..." }
      return Response.json(result, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Ошибка: ' + (e && (e.message || e))
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }
};
