import { useEffect, useRef, useState } from 'react';
import { requestMealPlanChat } from '../api/mealPlanApi';
import '../styles/mealPlan.css';

const STARTER_PROMPTS = [
  '\u0032\uC778 \uC800\uB141 \uC2DD\uB2E8 \uCD94\uCC9C\uD574\uC918',
  '\uAC10\uC790\uB791 \uBC84\uC12F\uC73C\uB85C \uB9CC\uB4E4 \uC218 \uC788\uB294 \uBA54\uB274 \uC54C\uB824\uC918',
  '\u0031\uC778 \uAC00\uC131\uBE44 \uC7A5\uBCF4\uAE30 \uB9AC\uC2A4\uD2B8 \uC9DC\uC918',
  '\uB0C9\uC7A5\uACE0 \uC7AC\uB8CC\uB85C \uAC04\uB2E8\uD55C \uC544\uCE68 \uBA54\uB274 \uCD94\uCC9C\uD574\uC918',
];

function createMessage(role, text, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    ...extra,
  };
}

export default function MealPlanPlaceholderPage() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(() => [
    createMessage(
      'assistant',
      '\uC548\uB155\uD558\uC138\uC694. oneulFarm \uB9DE\uCDA4 \uC2DD\uB2E8 AI\uC785\uB2C8\uB2E4.\n\uC778\uC6D0 \uC218, \uC608\uC0B0, \uB0C9\uC7A5\uACE0 \uC7AC\uB8CC\uB97C \uC54C\uB824\uC8FC\uC2DC\uBA74 \uC2DD\uB2E8\uACFC \uC7A5\uBCF4\uAE30 \uBC29\uD5A5\uC744 \uAC19\uC774 \uC815\uB9AC\uD574\uB4DC\uB9B4\uAC8C\uC694.'
    ),
  ]);
  const [previousResponseId, setPreviousResponseId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const messageListRef = useRef(null);
  const hasConversation = messages.length > 1;

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, isSending]);

  async function handleSend(messageText) {
    const normalizedMessage = String(messageText || '').trim();
    if (!normalizedMessage || isSending) {
      return;
    }

    setErrorMessage('');
    setDraft('');
    setIsSending(true);

    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage('user', normalizedMessage),
    ]);

    try {
      const response = await requestMealPlanChat({
        message: normalizedMessage,
        previousResponseId,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          'assistant',
          response.reply ||
            '\uC751\uB2F5\uC744 \uC900\uBE44\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
          {
            model: response.model || null,
            fallbackMode: Boolean(response.fallbackMode),
          }
        ),
      ]);

      setPreviousResponseId(response.responseId || null);
      setIsFallbackMode(Boolean(response.fallbackMode));
    } catch (error) {
      setErrorMessage(
        error.message ||
          '\uB9DE\uCDA4 \uC2DD\uB2E8 AI \uC751\uB2F5\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleSend(draft);
  }

  return (
    <div className="meal-plan-page page-shell">
      <main className="container">
        <section className="meal-plan-hero">
          <div className="meal-plan-hero__copy">
            <span className="meal-plan-hero__eyebrow">Meal Plan AI</span>
            <h1>{'\uB300\uD654\uB85C \uBC14\uB85C \uC9DC\uBCF4\uB294 \uB9DE\uCDA4 \uC2DD\uB2E8'}</h1>
            <p>
              {
                '\uC7AC\uB8CC, \uC608\uC0B0, \uC778\uC6D0 \uC218\uB97C \uB9D0\uD558\uBA74 \uC624\uB298 \uBA39\uAE30 \uC88B\uC740 \uBA54\uB274 \uBC29\uD5A5\uACFC \uC7A5\uBCF4\uAE30 \uD3EC\uC778\uD2B8\uB97C \uBC14\uB85C \uC815\uB9AC\uD574\uB4DC\uB9B4\uAC8C\uC694.'
              }
            </p>
          </div>

          <div className="meal-plan-hero__panel">
            <strong>{'\uC774\uB7F0 \uC9C8\uBB38\uC774 \uC88B\uC544\uC694'}</strong>
            <ul>
              <li>{'\uB0C9\uC7A5\uACE0\uC5D0 \uC788\uB294 \uC7AC\uB8CC\uB85C \uBB34\uC5C7\uC744 \uB9CC\uB4E4 \uC218 \uC788\uB294\uC9C0'}</li>
              <li>{'\u0031\uC778, \u0032\uC778 \uAE30\uC900\uC73C\uB85C \uC5B4\uB290 \uC815\uB3C4 \uC608\uC0B0\uC774 \uC801\uB2F9\uD55C\uC9C0'}</li>
              <li>{'\uB808\uC2DC\uD53C\uC640 \uC7A5\uBCF4\uAE30 \uC21C\uC11C\uB97C \uC5B4\uB5BB\uAC8C \uBB36\uC73C\uBA74 \uC88B\uC740\uC9C0'}</li>
            </ul>
          </div>
        </section>

        <section className="meal-plan-chat">
          <div className="meal-plan-chat__header">
            <div>
              <h2>{'\uB9DE\uCDA4 \uC2DD\uB2E8 \uC0C1\uB2F4'}</h2>
              <p>
                {
                  '\uC2DD\uB2E8 \uCD94\uCC9C, \uC7AC\uB8CC \uC815\uB9AC, \uC7A5\uBCF4\uAE30 \uD301\uC744 \uD55C \uBC88\uC5D0 \uC774\uC5B4\uC11C \uBC1B\uC744 \uC218 \uC788\uC5B4\uC694.'
                }
              </p>
            </div>
            {isFallbackMode ? (
              <span className="meal-plan-chat__status">
                {'\uB370\uBAA8 \uC751\uB2F5 \uBAA8\uB4DC'}
              </span>
            ) : hasConversation ? (
              <span className="meal-plan-chat__status is-live">
                {'AI \uC5F0\uACB0\uB428'}
              </span>
            ) : (
              <span className="meal-plan-chat__status">
                {'\uC0C1\uB2F4 \uC900\uBE44\uB428'}
              </span>
            )}
          </div>

          <div className="meal-plan-chat__prompts">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="meal-plan-chat__prompt"
                onClick={() => handleSend(prompt)}
                disabled={isSending}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div ref={messageListRef} className="meal-plan-chat__messages">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`meal-plan-message ${
                  message.role === 'user' ? 'is-user' : 'is-assistant'
                }`}
              >
                <div className="meal-plan-message__meta">
                  <strong>
                    {message.role === 'user' ? '\uB098' : 'Meal Plan AI'}
                  </strong>
                  {message.model ? <span>{message.model}</span> : null}
                </div>
                <p>{message.text}</p>
              </article>
            ))}

            {isSending ? (
              <article className="meal-plan-message is-assistant is-loading">
                <div className="meal-plan-message__meta">
                  <strong>Meal Plan AI</strong>
                </div>
                <p>{'\uC2DD\uB2E8\uC744 \uC815\uB9AC\uD558\uACE0 \uC788\uC5B4\uC694...'}</p>
              </article>
            ) : null}
          </div>

          {errorMessage ? <p className="meal-plan-chat__error">{errorMessage}</p> : null}

          <form className="meal-plan-chat__composer" onSubmit={handleSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                '\uC608: \u0032\uC778 \uC800\uB141\uC774\uACE0, \uC608\uC0B0\uC740 \u0032\uB9CC \uC6D0 \uC815\uB3C4\uC608\uC694. \uAC10\uC790\uB791 \uBC84\uC12F\uC774 \uC788\uC5B4\uC694.'
              }
              rows={3}
            />
            <button type="submit" disabled={isSending || !draft.trim()}>
              {'\uBCF4\uB0B4\uAE30'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
