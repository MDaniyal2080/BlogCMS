export default function Head() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const API_ORIGIN = API_URL.replace(/\/?api\/?$/, '');
  return (
    <>
      {/* Network performance hints */}
      <link rel="dns-prefetch" href={API_ORIGIN} />
      <link rel="preconnect" href={API_ORIGIN} crossOrigin="anonymous" />
    </>
  );
}
