export function createVercelConfig(value) {
  if (!value?.trim()) {
    throw new Error('BACKEND_URL is missing. Deploy the Spring Boot backend first, then add its HTTPS origin to the Vercel environment variables and redeploy. See DEPLOYMENT-VERCEL.md.');
  }
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('BACKEND_URL must be a valid HTTPS origin.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['','/'].includes(url.pathname) || ['localhost','127.0.0.1','[::1]'].includes(url.hostname)) {
    throw new Error('BACKEND_URL must be a public HTTPS origin without credentials, an /api path, query string or fragment.');
  }
  return {
    framework: null,
    installCommand: 'npm ci --prefix frontend --include=dev',
    buildCommand: 'npm run build',
    outputDirectory: 'frontend/dist',
    rewrites: [
      {source:'/api/:path*',destination:`${url.origin}/api/:path*`},
      ...['/lab','/passport','/staff','/admin','/craft/:path*','/card/:path*'].map(source=>({source,destination:'/index.html'}))
    ],
    headers: [{source:'/api/:path*',headers:[{key:'Cache-Control',value:'private, no-store'}]}]
  };
}
