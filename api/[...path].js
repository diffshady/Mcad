const normalizeBaseUrl = (value = '') => value.replace(/\/+$/, '');

export default async function handler(req, res) {
  const apiBaseUrl = normalizeBaseUrl(process.env.API_BASE_URL || '');

  if (!apiBaseUrl) {
    return res.status(500).json({
      message: 'API proxy is not configured. Set API_BASE_URL in Vercel project environment variables.',
    });
  }

  const rawPath = req.query.path;
  const pathSegments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const pathPart = pathSegments.join('/');

  const backendRoot = /\/api$/i.test(apiBaseUrl) ? apiBaseUrl : `${apiBaseUrl}/api`;
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const targetUrl = `${backendRoot}/${pathPart}${query}`;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];

  let body;
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (req.body != null) {
      body = JSON.stringify(req.body);
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const contentType = response.headers.get('content-type') || '';
    res.status(response.status);

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.json(data);
    }

    const text = await response.text();
    return res.send(text);
  } catch (error) {
    return res.status(502).json({
      message: 'Unable to reach backend API from Vercel proxy.',
      error: error.message,
    });
  }
}
