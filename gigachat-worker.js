/* ============================================================
   Cloudflare Worker — прокси для GigaChat (Сбер)
   Бесплатно решает две задачи:
   1) делает OAuth-авторизацию GigaChat (браузер сам не может —
      порт 9443 и самоподписанный сертификат);
   2) добавляет CORS, чтобы сайт мог обращаться к нему из браузера.

   КАК РАЗВЕРНУТЬ (бесплатно, ~5 минут):
   1. Зарегистрируйтесь на dash.cloudflare.com (бесплатно).
   2. Workers & Pages → Create application → Create Worker.
   3. Дайте имя (например «gigachat-proxy»), нажмите Deploy.
   4. Нажмите «Edit code» — удалите шаблон и вставьте ЭТОТ файл целиком.
   5. В настройках Worker: Settings → Variables → добавьте две
      переменные (Environment Variables):
        GIGACHAT_CLIENT_ID     = ваш Client ID
        GIGACHAT_CLIENT_SECRET = ваш Client Secret
      (их получают на developers.sber.ru → проект → «Получить ключ»,
       либо на smartspeech.sber.ru)
   6. Deploy. Worker станет доступен по адресу вида:
        https://gigachat-proxy.ВАШ-ЛОГИН.workers.dev
      Этот адрес вставьте на сайте в поле «Base URL» провайдера GigaChat.
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
      const clientId = env.GIGACHAT_CLIENT_ID;
      const clientSecret = env.GIGACHAT_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({
          error: 'Не заданы GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET в настройках Worker.'
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 1. Получаем OAuth-токен (действует ~30 минут)
      const auth = btoa(clientId + ':' + clientSecret);
      const tokenRes = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + auth,
          'RqUID': crypto.randomUUID()
        },
        body: 'scope=GIGACHAT_API_PERS'
      });
      if (!tokenRes.ok) {
        const t = await tokenRes.text();
        return new Response(JSON.stringify({ error: 'Ошибка OAuth: ' + tokenRes.status + ' ' + t.slice(0, 300) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Нет access_token в ответе OAuth: ' + JSON.stringify(tokenData).slice(0, 300) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 2. Проксируем запрос к GigaChat (принимает и отдаёт OpenAI-совместимый формат)
      const body = await request.json();
      const chatRes = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(body)
      });
      const data = await chatRes.json();
      if (!chatRes.ok) {
        return new Response(JSON.stringify({ error: 'Ошибка GigaChat: ' + JSON.stringify(data).slice(0, 400) }),
          { status: chatRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Внутренняя ошибка Worker: ' + (e && e.message) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }
};
