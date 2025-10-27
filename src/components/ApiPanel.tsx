import React from 'react'

export default function ApiPanel(){
  return (
    <div className="card">
      <h3>AI Helpers (placeholders)</h3>
      <p>This panel shows the sort of AI features you can hook into using Chrome's built-in AI APIs (Prompt, Summarizer, Proofreader, Rewriter).</p>
      <ul>
        <li>Summarize notes</li>
        <li>Rewrite paragraph to be clearer</li>
        <li>Proofread text</li>
        <li>Generate tailored study prompts</li>
      </ul>
      <p><em>Implementation hints:</em> use the Prompt API or the Summarizer API client-side. See README for links.</p>
    </div>
  )
}
