'use client';

import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('["A->B", "A->C", "B->D"]');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResponse(null);
    try {
      const data = JSON.parse(input);
      if (!Array.isArray(data)) throw new Error('Input must be an array');
      const res = await fetch('/bfhl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error('API error');
      const result = await res.json();
      setResponse(result);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Hierarchical Data Processor</h1>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow">
          <label className="block mb-2 font-semibold">Enter node array (JSON format):</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            rows={5}
            placeholder='["A->B", "A->C"]'
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Submit
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {response && (
          <div className="mt-8 bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Response</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(response, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
