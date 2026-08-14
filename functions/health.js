export default async function handler(req, res) {
  try {
    // Endereço testando a tabela 'monitoramento'
    const response = await fetch('https://paetkspbfejtjjkngqej.supabase.co/rest/v1/monitoramento?limit=1', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA',
        'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA'
      }
    });

    if (response.ok) {
      return res.status(200).send('ONLINE');
    }
    return res.status(500).send('OFFLINE');
  } catch (error) {
    return res.status(500).send('OFFLINE');
  }
}





export async function onRequest(context) {
  const url = 'https://paetkspbfejtjjkngqej.supabase.co/rest/v1/monitoramento?limit=1';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';

  try {
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      return new Response('ONLINE', { status: 200 });
    }
    return new Response('OFFLINE', { status: 500 });
  } catch (error) {
    return new Response('OFFLINE', { status: 500 });
  }
}

