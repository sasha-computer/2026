interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

function acceptsHtml(request: Request): boolean {
  const accept = request.headers.get('accept');
  if (!accept) return false;
  return accept.includes('text/html') || accept.includes('*/*');
}

function looksLikeAssetPath(pathname: string): boolean {
  const lastSegment = pathname.split('/').pop();
  return Boolean(lastSegment && lastSegment.includes('.'));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    if (method !== 'GET' && method !== 'HEAD') {
      return response;
    }

    if (looksLikeAssetPath(url.pathname)) {
      return response;
    }

    if (!acceptsHtml(request)) {
      return response;
    }

    const indexUrl = new URL('/index.html', url);
    const indexRequest = new Request(indexUrl.toString(), request);
    return env.ASSETS.fetch(indexRequest);
  }
};

