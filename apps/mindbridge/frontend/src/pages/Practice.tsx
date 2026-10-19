import { useState, type JSX, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { submitPractice } from '../api/profile'

interface Conversation {
  topic: string
  questions: string[]
}

export default function Practice(): JSX.Element {
  const [topic, setTopic] = useState('')
  const [conversation, setConversation] = useState<Conversation[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const trimmed = topic.trim()
    if (!trimmed) {
      setError('Enter a topic to generate practice questions.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await submitPractice(trimmed)
      setConversation((prev) => [...prev, { topic: res.topic, questions: res.questions }])
      setTopic('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate practice questions.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 bg-clip-text text-transparent">
          AI practice generator
        </h1>
        <p className="mt-2 text-slate-600">
          Ask for practice questions on any topic. Past prompts and responses stay in the thread
          below.
        </p>
      </header>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-8 bg-white rounded-2xl shadow-md p-4 sm:p-5 flex flex-col gap-3"
        aria-label="Practice generator form"
      >
        <label htmlFor="topic" className="text-sm font-medium text-slate-700">
          Topic
        </label>
        <textarea
          id="topic"
          rows={3}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          data-testid="practice-topic-input"
          placeholder="e.g. polynomial factorisation, photosynthesis, French verb conjugation"
          className="block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
        />

        {error && (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          data-testid="practice-submit-btn"
          className="self-end inline-flex items-center px-5 py-2 rounded-lg text-white text-sm font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow"
        >
          {busy ? 'Generating…' : 'Generate questions'}
        </button>
      </form>

      <div
        data-testid="practice-conversation"
        className="mt-8 space-y-6"
        aria-live="polite"
        aria-label="Practice conversation"
      >
        {conversation.length === 0 && (
          <p className="text-center text-sm text-slate-500">
            Your generated questions will appear here.
          </p>
        )}
        {conversation.map((msg, idx) => (
          <article
            key={idx}
            data-testid={`practice-message-${idx}`}
            className="bg-white rounded-2xl shadow-sm p-5 sm:p-6"
          >
            <header className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Topic</p>
              <span className="text-xs text-slate-400">#{idx + 1}</span>
            </header>
            <p className="mt-1 text-base font-medium text-slate-900">{msg.topic}</p>
            <ol className="mt-4 space-y-2 list-decimal list-inside text-slate-700">
              {msg.questions.map((q, qi) => (
                <li key={qi}>{q}</li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  )
}
