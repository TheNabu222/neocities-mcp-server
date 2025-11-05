 // File: /api/mcp.js

import fetch from 'node-fetch';

// The main function Vercel will run
export default async function handler(request, response) {
  // Only allow POST requests, as that's what Claude will use
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Your secret Neocities API Key from Vercel's Environment Variables
  const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;
  const NEOCITIES_API_BASE = "https://neocities.org/api";

  if (!NEOCITIES_API_KEY) {
    return response.status(500).json({ error: "API key is not configured on the server." });
  }

  try {
    const query = request.body.query || "";

    if (!query) {
      return response.status(400).json({ error: "No query provided in the request body." });
    }

    // --- Step 1: Get the list of files from your Neocities site ---
    const listResponse = await fetch(`${NEOCITIES_API_BASE}/list`, {
      headers: { Authorization: `Bearer ${NEOCITIES_API_KEY}` },
    });
    const listData = await listResponse.json();

    if (listData.result !== 'success') {
      throw new Error("Failed to fetch file list from Neocities.");
    }
    
    // Filter for only .html files to search
    const htmlFiles = listData.files.filter(file => file.path.endsWith('.html'));

    // --- Step 2: Search through the content of each file ---
    let searchResults = [];
    for (const file of htmlFiles) {
      const siteFileUrl = `https://${listData.info.sitename}.neocities.org/${file.path}`;
      const contentResponse = await fetch(siteFileUrl);
      const fileContent = await contentResponse.text();
      
      if (fileContent.toLowerCase().includes(query.toLowerCase())) {
        searchResults.push({
          id: file.path,
          title: `Content from ${file.path}`,
          // Provide a snippet of the file as context
          content: fileContent.substring(0, 2000) + '...'
        });
      }
    }
    
    // --- Step 3: Format the response for Claude ---
    const mcpResponse = {
      documents: searchResults
    };

    return response.status(200).json(mcpResponse);

  } catch (error) {
    console.error("Error processing request:", error);
    return response.status(500).json({ error: "An internal server error occurred." });
  }
}