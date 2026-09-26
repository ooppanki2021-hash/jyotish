/* ============================================================
   Cloudflare Worker для Workers AI — бесплатный прокси к чату.

   Как поставить (5 минут, бесплатно):
   1) Зарегистрируйтесь на https://dash.cloudflare.com/
   2) Workers & Pages → Create → Create Worker → имя (например
      astro-ai) → Deploy.
   3) Edit code → вставьте ЦЕЛИКОМ этот файл → Deploy.
   4) Settings → Variables and Secrets → Bindings → Add →
      тип «AI», имя — строго: AI
   5) Deploy ещё раз.
   6) В приложении/на сайте: провайдер «Cloudflare», в поле
      Base URL вставьте адрес вида
      https://astro-ai.ВАШ-ЛОГИН.workers.dev
      (поле API-ключ оставьте пустым).

   Бесплатный лимит: 10 000 нейронов/день — для личного чата
   более чем достаточно.
   ============================================================ */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }
    try {
      const { model, messages } = await request.json();
      const result = await env.AI.run(
        model || '@cf/meta/llama-3.1-8b-instruct',
        { messages }
      );
      // result = { response: "..." } — формат, который ждёт чат на сайте
      return new Response(JSON.stringify(result), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }
  }
};
