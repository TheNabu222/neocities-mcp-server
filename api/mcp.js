// File: /api/mcp.js

import fetch from 'node-fetch';

export default async function handler(request, response) {
  // --- NEW: Handle Claude's initial "health check" GET request ---
  if (request.method === 'GET') {
    console.log("Received a GET health check from Claude. Responding with success.");
    return response.status(200).json({ status: 'ok', message: 'Neocities MCP server is ready.' });
  }

  // Only allow POST requests for actual queries
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- NEW: Log the incoming request body for easier debugging ---
  console.log("Received POST request body from Claude:", JSON.stringify(request.body, null, 2));

  // Your secret Neocities API Key from Vercel's Environment Variables
  const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;
  const NEOCITIES_API_BASE = "https://neocities.org/api";

  if (!NEOCITIES_API_KEY) {
    console.error("FATAL ERROR: NEOCITIES_API_KEY is not configured in Vercel Environment Variables.");
    return response.status(500).json({ error: "Server configuration error: API key missing." });
  }

  try {
    const query = request.body?.query;

    // --- IMPROVEMENT: If there's no query, it might be a test. Respond gracefully. ---
    if (!query) {
      console.log("Request received, but no 'query' found. This might be a test POST request. Responding with empty results.");
      return response.status(200).json({ documents: [] });
    }

    // --- The rest of the logic remains the same ---
    const listResponse = await fetch(`${NEOCITIES_API_BASE}/list`, {
      headers: { Authorization: `Bearer ${NEOCITIES_API_KEY}` },
    });
    const listData = await listResponse.json();

    if (listData.result !== 'success') {
      console.error("Neocities API error:", listData);
      throw new Error(`Failed to fetch file list from Neocities: ${listData.message}`);
    }
    
    const htmlFiles = listData.files.filter(file => file.path.endsWith('.html'));

    let searchResults = [];
    for (const file of htmlFiles) {
      const siteFileUrl = `https://${listData.info.sitename}.neocities.org/${file.path}`;
      const contentResponse = await fetch(siteFileUrl);
      const fileContent = await contentResponse.text();
      
      if (fi